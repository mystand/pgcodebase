-- drop-code DROP FUNCTION bar()
CREATE FUNCTION bar() RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 1;
END;
$$;