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

export const DeleteUserMutation = gql`
  mutation DeleteUserMutation($username: String!) {
    deleteUserByUsername(input: { username: $username }) {
      clientMutationId
    }
  }
`;

export const DeleteUserMutationBad = gql`
  mutation DeleteUserMutation($username: String!) {
    deleteUserByUsername(input: { username: $username }) {
      user {
        id
      }
    }
  }
`;

export const UpdateUserMutation = gql`
  mutation UpdateUserMutation(
    $username: String!
    $newname: String
    $password: String
  ) {
    updateUserByUsername(
      input: {
        userPatch: { username: $newname, password: $password }
        username: $username
      }
    ) {
      user {
        id
        email
        username
      }
    }
  }
`;

export const UpdateUserMutationBad = gql`
  mutation UpdateUserMutation(
    $username: String!
    $newname: String
    $password: String
  ) {
    updateUserByUsername(
      input: {
        userPatch: { username: $newname, password: $password }
        username: $username
      }
    ) {
      user {
        id
        email
        username
        password
      }
    }
  }
`;
