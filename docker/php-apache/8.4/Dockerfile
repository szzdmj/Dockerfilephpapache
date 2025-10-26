# Known-good image: Apache + PHP, listens on :80 by default
FROM php:8.4-apache-bookworm

# DocumentRoot 默认是 /var/www/html；启用常用模块
RUN a2enmod rewrite headers

# 放一个占位首页和健康检查页（避免空站导致误判）
RUN set -eux; \
    mkdir -p /var/www/html; \
    printf "<?php echo 'OK';" > /var/www/html/index.php; \
    printf "<?php echo ((\$_GET['api'] ?? '')==='isats') ? '0' : 'ok';" > /var/www/html/v.php

EXPOSE 80
