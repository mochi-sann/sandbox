FROM ubuntu:24.04


RUN apt update
RUN apt install -y cron 

COPY task.sh /usr/local/bin/task.sh
COPY cron-example /etc/cron.d/cron-example

RUN chmod 0644 /usr/local/bin/task.sh

CMD ["cron", "-f"]
