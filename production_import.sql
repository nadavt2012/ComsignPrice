-- קוד להעברת כל 28 הפרויקטים לאתר המפורסם
-- פשוט העתק והדבק את כל הקוד הזה בקונסול הדאטה-בייס באתר המפורסם

-- מחיקת נתונים ישנים (אם יש)
DELETE FROM pricing_configs;

-- הכנסת כל 28 הפרויקטים בעברית
INSERT INTO pricing_configs (project_type, years, base_price, backup_certificate_price, icon, token_price, token_included) VALUES 
('מע״מ (ממשל זמין)', 2, 525, 305, 'User', 120, 'optional'),
('מע״מ (ממשל זמין)', 4, 765, 420, 'User', 120, 'optional'),
('מע״מ (ממשל זמין)', 5, 880, 465, 'User', 120, 'optional'),
('אדריכלים (רישוי זמין)', 4, 455, 305, 'Building', 120, 'optional'),
('משרד העבודה ורווחה', 2, 255, 0, 'FileText', 120, 'optional'),
('משרד העבודה ורווחה', 4, 325, 0, 'FileText', 120, 'optional'),
('בריאות (שקדיה)', 2, 285, 205, 'Stethoscope', 120, 'optional'),
('בריאות (שקדיה)', 4, 395, 255, 'Stethoscope', 120, 'optional'),
('שע״מ', 1, 345, 0, 'CalcIcon', 120, 'optional'),
('שע״מ', 2, 375, 0, 'CalcIcon', 120, 'optional'),
('שע״מ', 4, 475, 350, 'CalcIcon', 120, 'optional'),
('שע״מ', 5, 520, 350, 'CalcIcon', 120, 'optional'),
('מכס (שער עולמי)', 2, 290, 210, 'Car', 120, 'optional'),
('מכס (שער עולמי)', 4, 475, 315, 'Car', 120, 'optional'),
('מכס (שער עולמי)', 5, 535, 350, 'Car', 120, 'optional'),
('מגנא', 3, 990, 0, 'TrendingUp', 120, 'true'),
('עורך דין (נט המשפט)', 1, 295, 0, 'Scale', 120, 'true'),
('עורך דין (נט המשפט)', 2, 345, 0, 'Scale', 120, 'true'),
('עורך דין (נט המשפט)', 4, 455, 335, 'Scale', 120, 'true'),
('עורך דין (נט המשפט)', 5, 555, 335, 'Scale', 120, 'true'),
('נט המשפט (כתבים)', 2, 550, 0, 'FileText', 120, 'true'),
('אופטמטריסטים', 2, 350, 0, 'FileText', 120, 'optional'),
('אופטמטריסטים', 4, 515, 0, 'FileText', 120, 'optional'),
('אופטמטריסטים', 5, 590, 0, 'FileText', 120, 'optional'),
('פורטל ספקים', 2, 350, 270, 'User', 120, 'optional'),
('פורטל ספקים', 4, 515, 360, 'User', 120, 'optional'),
('פורטל ספקים', 5, 535, 390, 'User', 120, 'optional'),
('שמאים', 4, 510, 315, 'Car', 120, 'optional');

-- בדיקה שהכל הוכנס נכון
SELECT COUNT(*) as total_projects FROM pricing_configs;
SELECT DISTINCT project_type FROM pricing_configs ORDER BY project_type;