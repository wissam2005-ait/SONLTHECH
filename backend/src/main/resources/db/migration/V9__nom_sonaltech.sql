-- V9 : nom de l'entreprise harmonisé en « Sonaltech Électrique » (remplace l'ancienne orthographe « Sonlthech »).
update company_settings
   set name = 'Sonaltech Électrique',
       updated_at = now()
 where id = 1 and name in ('Sonlthech', 'ElectroPro');
