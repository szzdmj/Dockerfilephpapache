#+++++++++++++++++++++++++++++++++++++++
# Known-good PHP+Apache image that listens on :80
#+++++++++++++++++++++++++++++++++++++++

FROM webdevops/php-apache:8.4

# DocumentRoot 与首页
ENV WEB_DOCUMENT_ROOT=/app \
    WEB_DOCUMENT_INDEX=index.php \
    WEB_ALIAS_DOMAIN=*.vm \
    WEB_PHP_TIMEOUT=600

# 放一个占位首页 + 健康检查页
RUN set -eux; \
    mkdir -p /app; \
    printf "<?php echo 'OK';" > /app/index.php; \
    printf "<?php echo (isset(\$_GET['api']) && \$_GET['api']==='isats') ? '0' : 'ok';" > /app/v.php

# 如果你要拷贝自己的代码，可以追加 COPY 到 /app（但先用最小版验证监听与健康检查）
# COPY public/ /app/
# COPY Static_Creation/ /app/

EXPOSE 80
