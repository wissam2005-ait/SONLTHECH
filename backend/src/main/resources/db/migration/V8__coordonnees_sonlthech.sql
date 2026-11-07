-- V8 : coordonnées de l'entreprise cliente (Sonlthech).
-- Ne remplace que les valeurs par défaut : si le dirigeant a déjà rempli ses Paramètres, rien ne change.
update company_settings
   set name  = 'Sonlthech',
       city  = case when city is null or city = 'Alger' then 'Béjaïa' else city end,
       phone = coalesce(phone, '0770 33 79 63'),
       updated_at = now()
 where id = 1 and name = 'ElectroPro';
