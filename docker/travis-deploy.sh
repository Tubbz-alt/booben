#!/usr/bin/env bash

make project-build DEPLOY="demo"
make docker-build
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
docker tag booben:latest $DOCKER_REPO:demo
docker push $DOCKER_REPO:demo
docker rmi booben:latest

make project-build
make docker-build
docker tag booben:latest $DOCKER_REPO:latest
docker push $DOCKER_REPO:latest
docker tag $DOCKER_REPO:latest $DOCKER_REPO:"$(sed -nr 's/.*"version":\ "(.*)",/\1/p' package.json)"
docker push $DOCKER_REPO:"$(sed -nr 's/.*"version":\ "(.*)",/\1/p' package.json)"
