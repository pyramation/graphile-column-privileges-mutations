import '../utils/env';
import { GraphQLTest, env, snapshot } from 'graphile-test';
import {
  CreateUserMutation,
  CreateUserMutationBad,
  DeleteUserMutation,
  DeleteUserMutationBad,
  UpdateUserMutation,
  UpdateUserMutationBad
} from '../utils/queries';
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

describe('create', () => {
  it('success', async () => {
    await graphQL(async (query, pgClient) => {
      const data = await query(CreateUserMutation, {
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

  it('error', async () => {
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
});

describe('delete', () => {
  it('success', async () => {
    await graphQL(async (query, pgClient) => {
      const data = await query(DeleteUserMutation, {
        username: 'deleteme'
      });

      expect(snapshot(data)).toMatchSnapshot();

      await pgClient.query("select set_config('role', $1, true)", ['postgres']);
      const {
        rows: [row]
      } = await pgClient.query(
        table.select(['*'], {
          username: 'deleteme'
        })
      );
      expect(snapshot(row)).toMatchSnapshot();
    });
  });

  it('error', async () => {
    await graphQL(async query => {
      const { data, errors } = await query(DeleteUserMutationBad, {
        username: 'deleteme'
      });
      expect(errors).toBeTruthy();
      expect(errors[0].message).toMatchSnapshot();
    });
  });
});

describe('update', () => {
  it('success', async () => {
    await graphQL(async (query, pgClient) => {
      const data = await query(UpdateUserMutation, {
        username: 'updateme',
        password: 'newpassword',
        newname: 'newname'
      });

      expect(snapshot(data)).toMatchSnapshot();

      await pgClient.query("select set_config('role', $1, true)", ['postgres']);
      const {
        rows: [row]
      } = await pgClient.query(
        table.select(['*'], {
          username: 'newname'
        })
      );
      expect(snapshot(row)).toMatchSnapshot();
    });
  });

  it('error', async () => {
    await graphQL(async query => {
      const { data, errors } = await query(UpdateUserMutationBad, {
        username: 'updateme',
        password: 'newpassword',
        newname: 'newname'
      });
      expect(errors).toBeTruthy();
      expect(errors[0].message).toMatchSnapshot();
    });
  });
});
