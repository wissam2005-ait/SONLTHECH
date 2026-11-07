# ElectroPro — image unique pour l'hébergement cloud (Render) :
# le serveur Java sert à la fois l'API (/api) et le site React.
# (L'installation sur un PC avec docker-compose.yml utilise toujours backend/ et frontend/ séparément.)

# --- 1. Site React (Vite) ---
FROM node:20-slim AS front
WORKDIR /front
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# --- 2. Serveur Java (Maven), avec le site intégré ---
FROM maven:3.9-eclipse-temurin-17 AS back
WORKDIR /app
COPY backend/pom.xml .
RUN mvn -q -B dependency:go-offline
COPY backend/src ./src
COPY --from=front /front/dist ./src/main/resources/static
RUN mvn -q -B -DskipTests package

# --- 3. Image d'exécution légère ---
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 electropro
COPY --from=back /app/target/*.jar /app/app.jar
USER electropro
ENV SPRING_PROFILES_ACTIVE=prod \
    PORT=8080 \
    TZ=Africa/Algiers
EXPOSE 8080
# Réglages adaptés à une petite machine (512 Mo) : démarrage rapide, mémoire limitée
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-XX:+UseSerialGC", "-Xss512k", "-XX:TieredStopAtLevel=1", "-Duser.timezone=Africa/Algiers", "-jar", "/app/app.jar"]
