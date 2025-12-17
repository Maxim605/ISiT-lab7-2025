# Установка и настройка tracemap.pl

## Требования

1. **WSL (Windows Subsystem for Linux)** с установленным Ubuntu
2. **Perl** версии 5.x или выше
3. **Traceroute** утилита
4. **Sudo права** для выполнения traceroute

## Шаг 1: Установка зависимостей в WSL

Откройте WSL и выполните следующие команды:

```bash
sudo apt-get update
sudo apt-get install -y perl libnet-ip-perl
sudo apt-get install -y traceroute iputils-tracepath
perl --version
traceroute --version
```

## Шаг 2: Размещение tracemap.pl

**ВАЖНО:** Файл `tracemap.pl` должен находиться в той же директории, что и `server.js`:

```
ISiT-lab7-2025/
├── tracemap.pl      <- должен быть здесь
├── server.js
├── convert-dot-to-json.js
└── ...
```

### Где взять tracemap.pl?

1. **Из методических указаний** - файл должен быть приложен к лабораторной работе
2. **Из репозитория курса** - проверьте материалы курса ИСиТ
3. **Скопировать из старой версии проекта** - если у вас есть предыдущая версия

После получения файла, скопируйте его в директорию `ISiT-lab7-2025/`

## Шаг 3: Настройка прав доступа

Убедитесь, что файл tracemap.pl имеет права на выполнение:

```bash
cd /mnt/c/Users/maxim/Desktop/bmstu/proga/sem_5/lab_7/ISiT-lab7-2025
chmod +x tracemap.pl
```

## Шаг 4: Настройка sudo без пароля (опционально, но рекомендуется)

Чтобы не вводить пароль каждый раз, можно настроить sudo без пароля для конкретной команды:

```bash
# Откройте файл sudoers для редактирования
sudo visudo

# Добавьте в конец файла (замените путь на ваш):
%sudo ALL=(ALL) NOPASSWD: /usr/bin/perl /mnt/c/Users/maxim/Desktop/bmstu/proga/sem_5/lab_7/ISiT-lab7-2025/tracemap.pl
```

**Или** используйте переменную окружения `SUDO_PASSWORD` в файле `.env`:

```bash
# В директории ISiT-lab7-2025
echo "SUDO_PASSWORD=ваш_пароль" > .env
```

## Шаг 5: Проверка работы tracemap.pl

Проверьте, что tracemap.pl работает корректно:

```bash
cd /mnt/c/Users/maxim/Desktop/bmstu/proga/sem_5/lab_7/ISiT-lab7-2025

# Тестовая трассировка
(echo "google.com") | sudo perl tracemap.pl

# Проверьте, что создался файл tracemap.dot
ls -la tracemap.dot
cat tracemap.dot
```

## Шаг 6: Настройка файла prefixes.txt (если требуется)

Если tracemap.pl требует файл `prefixes.txt`, создайте его в той же директории:

```bash
# Создайте файл prefixes.txt (пример содержимого)
touch prefixes.txt
# Или скопируйте из примера, если он есть
```

## Возможные проблемы и решения

### Проблема: "perl: not found"
**Решение:** Установите perl: `sudo apt-get install -y perl`

### Проблема: "traceroute: command not found"
**Решение:** Установите traceroute: `sudo apt-get install -y traceroute`

### Проблема: "You do not have enough privileges"
**Решение:** Используйте sudo: `sudo perl tracemap.pl`

### Проблема: "socket: Operation not permitted"
**Решение:** 
1. Убедитесь, что используете sudo
2. Проверьте настройки WSL и сетевые права
3. Попробуйте запустить WSL от имени администратора

### Проблема: "readline() on closed filehandle PREFIXES"
**Решение:** Создайте файл `prefixes.txt` в директории с tracemap.pl (может быть пустым)

### Проблема: Файл tracemap.dot не создается
**Решение:**
1. Проверьте права на запись в директорию
2. Убедитесь, что трассировка завершилась успешно
3. Проверьте логи в консоли сервера

## Дополнительная информация

- tracemap.pl использует traceroute для построения графа сетевых маршрутов
- Результат сохраняется в формате DOT (Graphviz)
- Файл tracemap.dot автоматически конвертируется в graph.json для визуализации

