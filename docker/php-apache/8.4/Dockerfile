#+++++++++++++++++++++++++++++++++++++++
# Dockerfile for webdevops/php-apache:8.4
#    -- simplified & fixed to listen on :80 --
#+++++++++++++++++++++++++++++++++++++++

FROM webdevops/php-apache:8.4

# 设置站点根目录与首页（webdevops 默认虚拟主机会读取这些环境变量）
ENV WEB_DOCUMENT_ROOT=/app \
    WEB_DOCUMENT_INDEX=index.php \
    WEB_ALIAS_DOMAIN=*.vm \
    WEB_PHP_TIMEOUT=600

# 确保 DocumentRoot 存在，并放入占位首页，避免 Apache 因目录不存在而启动失败
RUN set -eux; \
    mkdir -p /app; \
    printf "<?php echo 'OK';" > /app/index.php

# 如需自定义 Apache 或 PHP 配置，可将文件放入 /opt/docker/ 对应目录
# COPY conf/ /opt/docker/

EXPOSE 80
