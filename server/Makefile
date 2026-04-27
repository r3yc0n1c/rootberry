BIN_DIR=./bin
BINARY_NAME=rootberry-server
BINARY_PATH=$(BIN_DIR)/$(BINARY_NAME)
MAIN_PATH=main.go

.PHONY: all build run tidy test clean help

## all: Tidies modules and builds binary in ./bin
all: tidy build

## build: Compiles the server binary into ./bin
build:
	@echo "==> Creating bin directory..."
	@mkdir -p $(BIN_DIR)
	@echo "==> Compiling binary to $(BINARY_PATH)..."
	go build -o $(BINARY_PATH) $(MAIN_PATH)

## run: Builds and then executes the binary
run: build
	@echo "==> Starting $(BINARY_PATH)..."
	$(BINARY_PATH)

## tidy: Downloads dependencies and removes unused ones
tidy:
	@echo "==> Tidying modules..."
	go mod tidy

## test: Runs all server tests
test:
	@echo "==> Running tests..."
	go test -v -race ./...

## clean: Deletes the ./bin directory
clean:
	@echo "==> Cleaning up..."
	rm -rf $(BIN_DIR)

## help: Shows this help menu
help:
	@echo "Server Management Commands:"
	@echo ""
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' |  sed -e 's/^/ /'