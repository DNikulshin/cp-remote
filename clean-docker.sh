#!/bin/bash

# Просим ввести имя сервиса (как в docker-compose ps)
echo "Список запущенных сервисов:"
docker-compose ps --services
echo "--------------------------"
read -p "Введите имя сервиса для удаления: " SERVICE_NAME

if [ -z "$SERVICE_NAME" ]; then
    echo "Имя не введено. Выход."
    exit 1
fi

echo "Остановка и удаление контейнера $SERVICE_NAME..."
docker-compose stop $SERVICE_NAME
docker-compose rm -f $SERVICE_NAME

# Спрашиваем, нужно ли удалить образ
read -p "Удалить также и образ этого сервиса? (y/n): " DELETE_IMAGE
if [ "$DELETE_IMAGE" == "y" ]; then
    # Получаем имя образа для этого сервиса
    IMAGE_NAME=$(docker-compose images -q $SERVICE_NAME)
    if [ ! -z "$IMAGE_NAME" ]; then
        docker rmi $IMAGE_NAME
        echo "Образ удален."
    else
        echo "Образ не найден."
    fi
fi

echo "Готово!"
