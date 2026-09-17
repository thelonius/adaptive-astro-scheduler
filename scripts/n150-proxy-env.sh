#!/usr/bin/env bash
export HTTP_PROXY="http://127.0.0.1:7890"
export HTTPS_PROXY="http://127.0.0.1:7890"
export ALL_PROXY="socks5://127.0.0.1:7891"
export NO_PROXY="localhost,127.0.0.1,::1"
export no_proxy="$NO_PROXY"
export NODE_USE_ENV_PROXY=1
