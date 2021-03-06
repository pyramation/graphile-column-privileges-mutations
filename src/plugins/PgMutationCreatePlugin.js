import debugFactory from 'debug';
const debug = debugFactory('graphile-build-pg');

export default (function PgMutationCreatePlugin(builder) {
  builder.hook(
    'GraphQLObjectType:fields',
    (fields, build, context) => {
      const {
        extend,
        newWithHooks,
        parseResolveInfo,
        pgIntrospectionResultsByKind,
        pgGetGqlTypeByTypeIdAndModifier,
        pgGetGqlInputTypeByTypeIdAndModifier,
        pgSql: sql,
        gql2pg,
        graphql: {
          GraphQLObjectType,
          GraphQLInputObjectType,
          GraphQLNonNull,
          GraphQLString
        },
        pgColumnFilter,
        inflection,
        pgQueryFromResolveData: queryFromResolveData,
        pgOmit: omit,
        pgViaTemporaryTable: viaTemporaryTable,
        describePgEntity,
        sqlCommentByAddingTags,
        pgField,
        pgPrepareAndRun
      } = build;
      const {
        scope: { isRootMutation },
        fieldWithHooks
      } = context;

      if (!isRootMutation) {
        return fields;
      }

      return extend(
        fields,
        pgIntrospectionResultsByKind.class.reduce((memo, table) => {
          // PERFORMANCE: These used to be .filter(...) calls
          if (!table.namespace) return memo;
          if (!table.isSelectable) return memo;
          if (!table.isInsertable || omit(table, 'create')) return memo;

          const primaryKeyConstraint = table.primaryKeyConstraint;
          if (!primaryKeyConstraint) return memo;

          const keyColumns = primaryKeyConstraint.keyAttributes;

          const Table = pgGetGqlTypeByTypeIdAndModifier(table.type.id, null);
          if (!Table) {
            debug(
              `There was no table type for table '${table.namespace.name}.${table.name}', so we're not generating a create mutation for it.`
            );
            return memo;
          }
          const TableInput = pgGetGqlInputTypeByTypeIdAndModifier(
            table.type.id,
            null
          );
          if (!TableInput) {
            debug(
              `There was no input type for table '${table.namespace.name}.${table.name}', so we're going to omit it from the create mutation.`
            );
          }
          const tableTypeName = inflection.tableType(table);
          const InputType = newWithHooks(
            GraphQLInputObjectType,
            {
              name: inflection.createInputType(table),
              description: `All input for the create \`${tableTypeName}\` mutation.`,
              fields: {
                clientMutationId: {
                  description:
                    'An arbitrary string value with no semantic meaning. Will be included in the payload verbatim. May be used to track mutations by the client.',
                  type: GraphQLString
                },
                ...(TableInput
                  ? {
                      [inflection.tableFieldName(table)]: {
                        description: `The \`${tableTypeName}\` to be created by this mutation.`,
                        type: new GraphQLNonNull(TableInput)
                      }
                    }
                  : null)
              }
            },
            {
              __origin: `Adding table create input type for ${describePgEntity(
                table
              )}. You can rename the table's GraphQL type via a 'Smart Comment':\n\n  ${sqlCommentByAddingTags(
                table,
                {
                  name: 'newNameHere'
                }
              )}`,
              isPgCreateInputType: true,
              pgInflection: table, // TODO:v5: remove - TYPO!
              pgIntrospection: table
            }
          );
          const PayloadType = newWithHooks(
            GraphQLObjectType,
            {
              name: inflection.createPayloadType(table),
              description: `The output of our create \`${tableTypeName}\` mutation.`,
              fields: ({ fieldWithHooks }) => {
                const tableName = inflection.tableFieldName(table);
                return {
                  clientMutationId: {
                    description:
                      'The exact same `clientMutationId` that was provided in the mutation input, unchanged and unused. May be used by a client to track mutations.',
                    type: GraphQLString
                  },
                  [tableName]: pgField(
                    build,
                    fieldWithHooks,
                    tableName,
                    {
                      description: `The \`${tableTypeName}\` that was created by this mutation.`,
                      type: Table
                    },
                    {
                      isPgCreatePayloadResultField: true,
                      pgFieldIntrospection: table
                    }
                  )
                };
              }
            },
            {
              __origin: `Adding table create payload type for ${describePgEntity(
                table
              )}. You can rename the table's GraphQL type via a 'Smart Comment':\n\n  ${sqlCommentByAddingTags(
                table,
                {
                  name: 'newNameHere'
                }
              )}\n\nor disable the built-in create mutation via:\n\n  ${sqlCommentByAddingTags(
                table,
                { omit: 'create' }
              )}`,
              isMutationPayload: true,
              isPgCreatePayloadType: true,
              pgIntrospection: table
            }
          );
          const fieldName = inflection.createField(table);
          memo = build.extend(
            memo,
            {
              [fieldName]: fieldWithHooks(
                fieldName,
                context => {
                  const { getDataFromParsedResolveInfoFragment } = context;
                  const relevantAttributes = table.attributes.filter(
                    attr =>
                      pgColumnFilter(attr, build, context) &&
                      !omit(attr, 'create')
                  );
                  return {
                    description: `Creates a single \`${tableTypeName}\`.`,
                    type: PayloadType,
                    args: {
                      input: {
                        type: new GraphQLNonNull(InputType)
                      }
                    },
                    async resolve(data, args, resolveContext, resolveInfo) {
                      const { input } = args;
                      const { pgClient } = resolveContext;
                      const parsedResolveInfoFragment = parseResolveInfo(
                        resolveInfo
                      );
                      parsedResolveInfoFragment.args = args; // Allow overriding via makeWrapResolversPlugin
                      const resolveData = getDataFromParsedResolveInfoFragment(
                        parsedResolveInfoFragment,
                        PayloadType
                      );
                      const insertedRowAlias = sql.identifier(Symbol());
                      const query = queryFromResolveData(
                        insertedRowAlias,
                        insertedRowAlias,
                        resolveData,
                        {},
                        null,
                        resolveContext,
                        resolveInfo.rootValue
                      );

                      const sqlKeyList = keyColumns.map(key =>
                        sql.identifier(key.name)
                      );

                      const sqlKeys = sql.join(sqlKeyList, ',');

                      const sqlFullTableName = sql.identifier(
                        table.namespace.name,
                        table.name
                      );

                      const sqlColumns = [];
                      const sqlValues = [];
                      const inputData = input[inflection.tableFieldName(table)];
                      relevantAttributes.forEach(attr => {
                        const fieldName = inflection.column(attr);
                        const val = inputData[fieldName];
                        if (
                          Object.prototype.hasOwnProperty.call(
                            inputData,
                            fieldName
                          )
                        ) {
                          sqlColumns.push(sql.identifier(attr.name));
                          sqlValues.push(
                            gql2pg(val, attr.type, attr.typeModifier)
                          );
                        }
                      });

                      const mutationQuery = sql.query`\
insert into ${sql.identifier(table.namespace.name, table.name)} ${
                        sqlColumns.length
                          ? sql.fragment`(${sql.join(
                              sqlColumns,
                              ', '
                            )}) values(${sql.join(sqlValues, ', ')})`
                          : sql.fragment`default values`
                      } returning ${sqlKeys}`;

                      let row;
                      try {
                        await pgClient.query('SAVEPOINT graphql_mutation');

                        const {
                          rows: [result]
                        } = await pgClient.query(sql.compile(mutationQuery));

                        const query = queryFromResolveData(
                          sqlFullTableName,
                          undefined,
                          resolveData,
                          { useAsterisk: false },
                          queryBuilder => {
                            const sqlTableAlias = queryBuilder.getTableAlias();
                            keyColumns.forEach(key => {
                              queryBuilder.where(
                                sql.fragment`${sqlTableAlias}.${sql.identifier(
                                  key.name
                                )} = ${gql2pg(
                                  result[key.name],
                                  key.type,
                                  key.typeModifier
                                )}`
                              );
                            });
                          },
                          resolveContext,
                          resolveInfo.rootValue
                        );
                        const { text, values } = sql.compile(query);
                        ({
                          rows: [row]
                        } = await pgPrepareAndRun(pgClient, text, values));

                        await pgClient.query(
                          'RELEASE SAVEPOINT graphql_mutation'
                        );
                      } catch (e) {
                        await pgClient.query(
                          'ROLLBACK TO SAVEPOINT graphql_mutation'
                        );
                        throw e;
                      }
                      return {
                        clientMutationId: input.clientMutationId,
                        data: row
                      };
                    }
                  };
                },
                {
                  pgFieldIntrospection: table,
                  isPgCreateMutationField: true
                }
              )
            },
            `Adding create mutation for ${describePgEntity(
              table
            )}. You can omit this default mutation with a 'Smart Comment':\n\n  ${sqlCommentByAddingTags(
              table,
              {
                omit: 'create'
              }
            )}`
          );
          return memo;
        }, {}),
        `Adding default 'create' mutation to root mutation`
      );
    },
    ['PgMutationCreate'],
    [],
    ['PgTables']
  );
});
