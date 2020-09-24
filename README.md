# graphile-column-privileges-mutations [![Build Status](https://travis-ci.org/pyramation/graphile-column-privileges-mutations.svg?branch=master)](https://travis-ci.org/pyramation/graphile-column-privileges-mutations)

```sh
npm install graphile-column-privileges-mutations 
```

This [PostGraphile](http://postgraphile.org/) schema plugin was built to enable use of column-level SELECT grants, while still providing auto-generated mutations within PostGraphile. It works by using primary or unique constraints.

To give you a sense of why/where this plugin was born: https://github.com/graphile/graphile-engine/issues/260

## Usage

1. Disable the default mutations in your graphile settings object
2. Append the new plugins!
3. Enjoy!

```js
app.use(
  postgraphile(connectionStr, schemas, {
    appendPlugins: [
      PgMutationCreatePlugin,
      PgMutationUpdateDeletePlugin
    ],
    graphileBuildOptions: {
      // disable the default mutations
      pgDisableDefaultMutations: true
    }
  })
);
```

## Examples

Example with app users and select grants here:

https://github.com/pyramation/graphile-column-select-grants-example


## Testing

```sh
createdb mutation_example
psql mutation_example < sql/roles.sql
psql mutation_example < sql/user.sql
psql mutation_example < sql/schema.sql
yarn test
```
