# --- Construction du serveur (Maven) ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# --- Image d'exécution, légère, sans les outils de compilation ---
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 electropro && mkdir -p /data/uploads && chown electropro /data/uploads
COPY --from=build /app/target/*.jar /app/app.jar
USER electropro
ENV SPRING_PROFILES_ACTIVE=prod \
    UPLOAD_DIR=/data/uploads \
    PORT=8080 \
    TZ=Africa/Algiers
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-Duser.timezone=Africa/Algiers", "-jar", "/app/app.jar"]
