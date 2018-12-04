--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------
CREATE TABLE products (
  product_name STRING PRIMARY KEY,
  product_fullname  STRING,
  product_version   STRING NOT NULL DEFAULT "0.0.0",
  product_mac       STRING
);

CREATE INDEX product_ix_hostname ON products (product_fullname);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------
DROP INDEX product_ix_hostname;
DROP TABLE products;
