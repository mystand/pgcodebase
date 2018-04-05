-- require function_bar.sql
-- drop-code DROP FUNCTION foo()
CREATE FUNCTION foo() RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN bar();
END;
$$;