# Django Weather Auth Project (Modern UI)

Quick start:
1. Create and activate conda env:
   conda create -n django-env python=3.11 -y
   conda activate django-env

2. Install dependencies:
   conda install -c conda-forge mysqlclient -y || pip install pymysql
   pip install "django>=4.2,<5"

3. Place project under a folder, then run:
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver

4. Visit http://127.0.0.1:8000/
