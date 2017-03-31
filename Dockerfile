FROM registry.ordbuy.com/common/nodejs:latest
LABEL maintainer "Dmitriy Bizyaev"

ENV NODE_ENV=development \
    JSSY_PORT=3000 \
    JSSY_SERVE_STATIC=true \
    JSSY_PROJECTS_DIR=/var/lib/jssy/projects

COPY . /usr/src/app

WORKDIR /usr/src/app

RUN apk --no-cache add --update \
      nodejs \
      python \
      make \
      g++ \
    && yarn install --production \
    && npm dedupe \
    && npm rm -g yarn npm \
    && rm -rf /tmp/* \
    && rm -rf /root/..?* /root/.[!.]* /root/*

VOLUME /var/lib/jssy

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "docker-entrypoint.sh"]
