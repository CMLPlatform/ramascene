# Generated by Django 2.1 on 2019-09-05 16:17

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Country',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('code', models.CharField(max_length=200)),
                ('global_id', models.IntegerField()),
                ('parent_id', models.IntegerField()),
                ('local_id', models.IntegerField()),
                ('level', models.IntegerField()),
                ('identifier', models.CharField(max_length=200)),
                ('leaf_children_global', models.TextField(max_length=1000)),
                ('leaf_children_local', models.TextField(max_length=1000)),
            ],
        ),
        migrations.CreateModel(
            name='Indicator',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('unit', models.CharField(max_length=200)),
                ('global_id', models.IntegerField()),
                ('parent_id', models.IntegerField()),
                ('local_id', models.IntegerField()),
                ('level', models.IntegerField()),
            ],
        ),
        migrations.CreateModel(
            name='Job',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('status', models.CharField(blank=True, max_length=255, null=True)),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
                ('completed', models.DateTimeField(blank=True, null=True)),
                ('celery_id', models.CharField(blank=True, max_length=255, null=True)),
            ],
            options={
                'ordering': ('created',),
            },
        ),
        migrations.CreateModel(
            name='ModellingProduct',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('code', models.CharField(max_length=200)),
                ('global_id', models.IntegerField()),
                ('parent_id', models.IntegerField()),
                ('local_id', models.IntegerField()),
                ('level', models.IntegerField()),
                ('identifier', models.CharField(max_length=200)),
                ('leaf_children_global', models.TextField(max_length=1000)),
                ('leaf_children_local', models.TextField(max_length=1000)),
            ],
        ),
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('code', models.CharField(max_length=200)),
                ('global_id', models.IntegerField()),
                ('parent_id', models.IntegerField()),
                ('local_id', models.IntegerField()),
                ('level', models.IntegerField()),
                ('identifier', models.CharField(max_length=200)),
                ('leaf_children_global', models.TextField(max_length=1000)),
                ('leaf_children_local', models.TextField(max_length=1000)),
            ],
        ),
    ]
