FROM nginx:alpine

# Install OpenSSL for dummy certificate generation
RUN apk add --no-cache openssl

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY sites-available/ /etc/nginx/sites-available/

# Create necessary directories
RUN mkdir -p /var/log/nginx \
             /var/www/certbot \
             /etc/letsencrypt/live/llmsmr.io \
             /etc/nginx/sites-enabled

# Create dummy SSL certificates to prevent nginx startup failures
# These will be replaced by real Let's Encrypt certificates when available
RUN openssl genrsa -out /etc/letsencrypt/live/llmsmr.io/privkey.pem 2048 && \
    openssl req -new -x509 -key /etc/letsencrypt/live/llmsmr.io/privkey.pem \
    -out /etc/letsencrypt/live/llmsmr.io/fullchain.pem -days 365 \
    -subj "/CN=llmsmr.io" && \
    chmod 600 /etc/letsencrypt/live/llmsmr.io/privkey.pem && \
    chmod 644 /etc/letsencrypt/live/llmsmr.io/fullchain.pem

# Enable the site configuration
RUN ln -sf /etc/nginx/sites-available/smr-io.conf /etc/nginx/sites-enabled/default

# Test nginx configuration
RUN nginx -t

# Expose ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
