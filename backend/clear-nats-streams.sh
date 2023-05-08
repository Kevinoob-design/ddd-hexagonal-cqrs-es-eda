#!/bin/sh
for stream in $(nats stream list --json | jq -r '.[]'); do
  nats stream delete $stream -f
done
