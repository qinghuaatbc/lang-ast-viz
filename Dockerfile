# Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Build backend
FROM golang:1.22-alpine AS backend
WORKDIR /app
COPY backend/ .
RUN go build -o /server .

# Runtime
FROM alpine:3.19
RUN apk add --no-cache ca-certificates gcc musl-dev libgcc
COPY --from=frontend /app/dist /frontend/dist
COPY --from=backend /server /server
WORKDIR /
ENV PORT=8010
EXPOSE 8010
CMD ["/server"]
