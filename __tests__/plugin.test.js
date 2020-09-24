import { GraphQLTest } from '../utils/graphql';
import { CreateUserMutation, CreateUserMutationBad } from '../utils/queries';
import env from '../utils/env';
import { snapshot } from '../utils/clean';
import { PgMutationCreatePlugin, PgMutationUpdateDeletePlugin } from '../src';
import { Schema } from 'pg-query-string';

const { SCHEMA } = env;
const schema = new Schema(SCHEMA);
const table = schema.table('users', {
  id: 'int',
  username: 'text',
  email: 'text',
  password: 'text'
});

const getDbString = () =>
  `postgres://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`;

const { setup, teardown, graphQL } = GraphQLTest(
  {
    appendPlugins: [PgMutationUpdateDeletePlugin, PgMutationCreatePlugin],
    graphileBuildOptions: {
      // disable the default mutations
      pgDisableDefaultMutations: true
    },
    schema: SCHEMA,
    graphqlRoute: '/graphql'
  },
  getDbString()
);

beforeAll(async () => {
  await setup();
});
afterAll(async () => {
  await teardown();
});

it('allows select without password', async () => {
  await graphQL(async (query, pgClient) => {
    const { data } = await query(CreateUserMutation, {
      email: 'pyramation@example.com',
      username: 'pyramation',
      password: 'password'
    });

    expect(snapshot(data)).toMatchSnapshot();

    // ensure password exists
    await pgClient.query("select set_config('role', $1, true)", ['postgres']);
    const {
      rows: [row]
    } = await pgClient.query(
      table.select(['id', 'email', 'username', 'password'], {
        username: 'pyramation'
      })
    );
    expect(snapshot(row)).toMatchSnapshot();
  });
});

it('disallows password on select', async () => {
  await graphQL(async query => {
    const { data, errors } = await query(CreateUserMutationBad, {
      email: 'pyramation@example.com',
      username: 'pyramation',
      password: 'password'
    });
    expect(errors).toBeTruthy();
    expect(errors[0].message).toMatchSnapshot();
  });
});
