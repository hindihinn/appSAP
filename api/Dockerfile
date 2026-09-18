FROM golang:1.26.4-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:latest  

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/server .

# Create the uploads directory inside container
RUN mkdir -p uploads

EXPOSE 5000

CMD ["./server"]
