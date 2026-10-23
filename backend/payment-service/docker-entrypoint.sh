#!/bin/sh
set -e

# Convert Render's postgres:// or postgresql:// connection string to JDBC format
# Format from Render: postgres://user:password@host:port/dbname
# Format needed by Spring Boot/Flyway: jdbc:postgresql://host:port/dbname
if [ -n "$DATABASE_URL" ]; then
  case "$DATABASE_URL" in
    jdbc:*)
      export SPRING_DATASOURCE_URL="$DATABASE_URL"
      ;;
    postgres://*|postgresql://*)
      RAW_URL=$(echo "$DATABASE_URL" | sed -e 's/^postgres:\/\///' -e 's/^postgresql:\/\///')
      if echo "$RAW_URL" | grep -q '@'; then
        USER_PASS=$(echo "$RAW_URL" | cut -d'@' -f1)
        HOST_PORT_DB=$(echo "$RAW_URL" | cut -d'@' -f2-)
        DB_USER=$(echo "$USER_PASS" | cut -d':' -f1)
        DB_PASSWORD=$(echo "$USER_PASS" | cut -d':' -f2-)
        export SPRING_DATASOURCE_USERNAME="$DB_USER"
        export SPRING_DATASOURCE_PASSWORD="$DB_PASSWORD"
      else
        HOST_PORT_DB="$RAW_URL"
      fi
      export SPRING_DATASOURCE_URL="jdbc:postgresql://$HOST_PORT_DB"
      ;;
  esac
fi

exec java -jar app.jar "$@"
