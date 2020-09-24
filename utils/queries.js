import gql from 'graphql-tag';

export const CreateUserMutation = gql`
  mutation CreateUserMutation(
    $email: String!
    $username: String!
    $password: String!
  ) {
    createUser(
      input: {
        user: { email: $email, username: $username, password: $password }
      }
    ) {
      user {
        id
        username
        email
      }
    }
  }
`;

export const CreateUserMutationBad = gql`
  mutation CreateUserMutation(
    $email: String!
    $username: String!
    $password: String!
  ) {
    createUser(
      input: {
        user: { email: $email, username: $username, password: $password }
      }
    ) {
      user {
        id
        username
        email
        password
      }
    }
  }
`;
