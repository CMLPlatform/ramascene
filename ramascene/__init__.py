from django.db.backends.signals import connection_created


# workaround for enabling Sqlite WAL mode
def activate_foreign_keys(sender, connection, **kwargs):
    if connection.vendor == 'sqlite':
        cursor = connection.cursor()
        cursor.execute('PRAGMA journal_mode=wal;')


connection_created.connect(activate_foreign_keys)
