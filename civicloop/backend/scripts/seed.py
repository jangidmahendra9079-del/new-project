"""
Seed script — default data DB mein daalna.
Run: python scripts/seed.py

Creates:
  - Super admin user
  - Default departments
  - Default categories  
  - Sample wards (1-10)
  - SLA rules
"""
import sys
import os

# Backend root ko path mein add karo
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.database import db
from app.models.user import User
from app.models.department import Department
from app.models.category import Category
from app.models.ward import Ward
from app.models.sla import SLARule
from app.models.civic_score import CivicScore
from app.auth.security import hash_password


def seed():
    app = create_app()

    with app.app_context():
        print("[*] Seeding database...")

        # ── SLA Rules ────────────────────────────────────────────────
        sla_rules = [
            {'severity': 'critical', 'hours': 24},
            {'severity': 'high',     'hours': 48},
            {'severity': 'medium',   'hours': 72},
            {'severity': 'low',      'hours': 168},
        ]
        for rule in sla_rules:
            if not SLARule.query.filter_by(severity=rule['severity']).first():
                db.session.add(SLARule(**rule))
        print("  [OK] SLA rules seeded")

        # ── Departments ───────────────────────────────────────────────
        departments_data = [
            {'name': 'Roads & Infrastructure', 'code': 'ROADS',
             'description': 'Roads, potholes, bridges', 'contact_email': 'roads@civicloop.gov'},
            {'name': 'Water Supply',            'code': 'WATER',
             'description': 'Water pipes, leaks, supply', 'contact_email': 'water@civicloop.gov'},
            {'name': 'Electricity',             'code': 'ELEC',
             'description': 'Streetlights, power lines', 'contact_email': 'elec@civicloop.gov'},
            {'name': 'Sanitation & Waste',      'code': 'SANIT',
             'description': 'Garbage, drainage, sewage', 'contact_email': 'sanit@civicloop.gov'},
            {'name': 'Parks & Green Spaces',    'code': 'PARKS',
             'description': 'Parks, trees, public spaces', 'contact_email': 'parks@civicloop.gov'},
        ]
        dept_map = {}
        for d in departments_data:
            existing = Department.query.filter_by(code=d['code']).first()
            if not existing:
                dept = Department(**d)
                db.session.add(dept)
                db.session.flush()
                dept_map[d['code']] = dept.id
            else:
                dept_map[d['code']] = existing.id
        print("  [OK] Departments seeded")

        # ── Categories ────────────────────────────────────────────────
        categories_data = [
            {'name': 'Pothole',       'slug': 'pothole',      'department_code': 'ROADS',  'color': '#ef4444'},
            {'name': 'Road Damage',   'slug': 'road_damage',  'department_code': 'ROADS',  'color': '#f97316'},
            {'name': 'Garbage',       'slug': 'garbage',      'department_code': 'SANIT',  'color': '#84cc16'},
            {'name': 'Drainage',      'slug': 'drainage',     'department_code': 'SANIT',  'color': '#06b6d4'},
            {'name': 'Water Leak',    'slug': 'water_leak',   'department_code': 'WATER',  'color': '#3b82f6'},
            {'name': 'Streetlight',   'slug': 'streetlight',  'department_code': 'ELEC',   'color': '#eab308'},
            {'name': 'Encroachment',  'slug': 'encroachment', 'department_code': 'ROADS',  'color': '#8b5cf6'},
            {'name': 'Other',         'slug': 'other',        'department_code': None,      'color': '#6b7280'},
        ]
        for c in categories_data:
            if not Category.query.filter_by(slug=c['slug']).first():
                dept_id = dept_map.get(c.pop('department_code')) if c.get('department_code') else None
                c.pop('department_code', None)
                cat = Category(**c, department_id=dept_id)
                db.session.add(cat)
        print("  [OK] Categories seeded")

        # ── Wards ─────────────────────────────────────────────────────
        for i in range(1, 11):
            if not Ward.query.filter_by(ward_number=i).first():
                db.session.add(Ward(
                    name=f'Ward {i}',
                    ward_number=i,
                    city='CivicCity',
                    district='Central District',
                    state='Demo State',
                    center_lat=28.6139 + (i * 0.01),
                    center_lng=77.2090 + (i * 0.01),
                ))
        print("  [OK] Wards seeded (1-10)")

        # ── Super Admin User ──────────────────────────────────────────
        admin_email = 'admin@civicloop.gov'
        if not User.query.filter_by(email=admin_email).first():
            admin = User(
                name='Super Admin',
                email=admin_email,
                hashed_password=hash_password('Admin@1234'),
                role='super_admin',
                is_active=True,
                is_verified=True,
            )
            db.session.add(admin)
            print(f"  [OK] Super admin created: {admin_email} / Admin@1234")
        else:
            print(f"  [INFO] Super admin already exists: {admin_email}")

        # ── Demo Citizen ──────────────────────────────────────────────
        citizen_email = 'citizen@civicloop.gov'
        if not User.query.filter_by(email=citizen_email).first():
            citizen = User(
                name='Demo Citizen',
                email=citizen_email,
                hashed_password=hash_password('Citizen@1234'),
                role='citizen',
                is_active=True,
                is_verified=True,
            )
            db.session.add(citizen)
            db.session.flush()
            db.session.add(CivicScore(user_id=citizen.id, total_score=25))
            print(f"  [OK] Demo citizen created: {citizen_email} / Citizen@1234")

        # ── Demo Field Officer ────────────────────────────────────────
        officer_email = 'officer@civicloop.gov'
        if not User.query.filter_by(email=officer_email).first():
            db.session.add(User(
                name='Demo Officer',
                email=officer_email,
                hashed_password=hash_password('Officer@1234'),
                role='field_officer',
                is_active=True,
                is_verified=True,
            ))
            print(f"  [OK] Demo officer created: {officer_email} / Officer@1234")

        db.session.commit()
        print("\n[SUCCESS] Seeding complete!")
        print("\nLogin credentials:")
        print("  Admin   -> admin@civicloop.gov   / Admin@1234")
        print("  Citizen -> citizen@civicloop.gov / Citizen@1234")
        print("  Officer -> officer@civicloop.gov / Officer@1234")


if __name__ == '__main__':
    seed()
