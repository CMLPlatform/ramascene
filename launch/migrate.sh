find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
find . -path "*/migrations/*.pyc"  -delete

python3 manage.py makemigrations 
python3 manage.py migrate
python3 manage.py populateHierarchies
