FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app

# Non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1001 appuser

COPY --from=build /app/target/*.jar app.jar
COPY docker-entrypoint.sh .
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh && chown -R appuser:appgroup /app

USER appuser

ENV PORT=8080
ENV JAVA_TOOL_OPTIONS="-Xmx300m -XX:+UseSerialGC -XX:MaxMetaspaceSize=96m"

EXPOSE 8080

ENTRYPOINT ["./docker-entrypoint.sh"]
