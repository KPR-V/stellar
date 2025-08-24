default: build

all: clean build test

test: build
	cargo test

build:
	stellar contract build

clean:
	cargo clean

deploy-testnet:
	stellar contract deploy \
		--wasm target/wasm32v1-none/release/arbitrage-bot.wasm \
		--source alice \
		--network testnet

fmt:
	cargo fmt --all

clippy:
	cargo clippy --all-targets --all-features -- -D warnings

optimize:
	stellar contract optimize \
		--wasm target/wasm32v1-none/release/arbitrage-bot.wasm
