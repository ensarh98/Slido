# Slido

Slido je aplikacija koja će pomoći u interakciji publike tokom predavanja, konferencija i drugih sličnih događaja.
Ova aplikacija je dizajnirana kako bi omogućila interakciju između publike i predavača na predavanjima, konferencijama i sličnim događajima. 
Sadrži module za administratore sistema, predavače i publiku. Administratori upravljaju korisnicima i događajima, predavači kreiraju predavanja i odgovaraju na pitanja, dok publika prati predavanja, postavlja pitanja i odobrava druga pitanja. Aplikacija olakšava organizaciju i interakciju tokom događaja.

## Korištene Tehnologije

U razvoju ove aplikacije, koristio sam PostgreSQL kao bazu podataka i Node.js kao backend okvir, dok sam za izradu korisničkog interfejsa koristio EJS.

## Instalacija

Ako želite pokrenuti ovaj projekt lokalno na svom računalu, slijedite sljedeće korake:

1. Klonirajte projekat na svoje računalo
3. Instalirajte potrebne biblioteke pomoću "npm install"
4. Pokrenite potrebne migracije za bazu podataka koje se nalaze u direktoriju doc:
   - migrations.sql
   - seed.sql (email: admin@pmf.ba, pw: admin123)
5. Pokrenite aplikaciju:
   npm start
