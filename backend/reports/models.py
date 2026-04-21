from django.db import models


class IdeasPerDepartmentView(models.Model):
    department = models.CharField(max_length=100, primary_key=True)
    academic_year = models.CharField(max_length=50)
    idea_count = models.IntegerField()
    percentage = models.DecimalField(max_digits=5, decimal_places=1)

    class Meta:
        managed = False
        db_table = "v_ideas_per_department"

    def __str__(self) -> str:
        return f"{self.department} ({self.academic_year}): {self.idea_count} ideas"


class ContributorsPerDepartmentView(models.Model):
    department = models.CharField(max_length=100, primary_key=True)
    academic_year = models.CharField(max_length=50)
    contributor_count = models.IntegerField()
    percentage = models.DecimalField(max_digits=5, decimal_places=1)

    class Meta:
        managed = False
        db_table = "v_contributors_per_department"

    def __str__(self) -> str:
        return f"{self.department} ({self.academic_year}): {self.contributor_count} contributors"


class IdeasPerCategoryView(models.Model):
    category_id = models.IntegerField(primary_key=True)
    category = models.CharField(max_length=100)
    department_id = models.IntegerField()
    academic_year_id = models.IntegerField()
    academic_year = models.CharField(max_length=50)
    idea_count = models.IntegerField()
    percentage = models.DecimalField(max_digits=5, decimal_places=1)

    class Meta:
        managed = False
        db_table = "v_ideas_per_category"

    def __str__(self) -> str:
        return f"{self.category} ({self.academic_year}): {self.idea_count} ideas"


class ContributorActivityPerDepartmentView(models.Model):
    department_id = models.IntegerField(primary_key=True)
    department = models.CharField(max_length=100)
    academic_year_id = models.IntegerField()
    academic_year = models.CharField(max_length=50)
    contributed_count = models.IntegerField()
    not_contributed_count = models.IntegerField()
    total_user_count = models.IntegerField()
    contributed_percentage = models.DecimalField(max_digits=5, decimal_places=1, null=True)
    not_contributed_percentage = models.DecimalField(max_digits=5, decimal_places=1, null=True)

    class Meta:
        managed = False
        db_table = "v_contributor_activity_per_department"

    def __str__(self) -> str:
        return f"{self.department} ({self.academic_year}): {self.contributed_count}/{self.total_user_count} contributed"
