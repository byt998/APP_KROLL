# KROLL PWA

Pierwsza wersja aplikacji pracownika KROLL. Zawiera logowanie, rejestrację przez
numer telefonu i hasło oraz bazowy ekran HOME. Karty modułów na HOME są
przygotowane pod dalszy rozwój i na tym etapie nie otwierają nowych ekranów.

## Jak działa logowanie

Użytkownik widzi wyłącznie pola `Numer telefonu` i `Hasło`. Aplikacja w tle
zamienia numer telefonu na email techniczny używany przez Supabase
Authentication:

```text
Użytkownik wpisuje: 500 600 700
Supabase otrzymuje: 500600700@app.local
```

Email techniczny nie jest wyświetlany użytkownikowi i nie służy do odbierania
wiadomości. Jeżeli użytkownik zapomni hasła, administrator ustawia mu nowe hasło
w panelu Supabase.

## Uruchomienie lokalne

Wymagany jest Node.js 20 lub nowszy.

1. Zainstaluj zależności:

   ```powershell
   npm install
   ```

2. Skopiuj `.env.example` jako `.env`.
3. Uzupełnij `.env` danymi projektu Supabase:

   ```dotenv
   VITE_SUPABASE_URL=https://twoj-projekt.supabase.co
   VITE_SUPABASE_ANON_KEY=twoj-klucz-publiczny
   VITE_AUTH_EMAIL_DOMAIN=app.local
   ```

   Ważne: adres `VITE_SUPABASE_URL` ma kończyć się na `.supabase.co`. Nie dopisuj
   `/rest/v1/`.

4. Uruchom aplikację:

   ```powershell
   npm run dev
   ```

Klucz `service_role` ani klucz `secret` nie mogą trafić do `.env` frontendu.
Użyj publicznego klucza `publishable` albo starszego klucza `anon`.

## Przygotowanie Supabase

1. Otwórz swój projekt Supabase.
2. Wejdź w `SQL Editor`.
3. Wklej zawartość pliku `supabase/schema.sql` i uruchom SQL.
4. Wejdź w `Authentication > Providers > Email`.
5. Upewnij się, że logowanie emailem jest włączone.
6. Wyłącz wymaganie potwierdzania emaila. Adres techniczny `@app.local` nie ma
   skrzynki odbiorczej, więc użytkownik nie może kliknąć linku aktywacyjnego.

Provider telefonu i SMS OTP nie są potrzebne.

Plik SQL tworzy:

- tabelę `profiles` z danymi użytkowników,
- tabelę `registration_allowlist` z dozwolonymi numerami,
- funkcję sprawdzającą numer przed rejestracją,
- trigger tworzący profil,
- politykę RLS pozwalającą użytkownikowi czytać wyłącznie własny profil.

Tabela `profiles` celowo nie ma pola `shift_code`.

## Dodawanie numeru do listy

Przed rejestracją użytkownika dodaj jego numer jako 9 cyfr bez `+48`, spacji
i myślników:

```sql
insert into public.registration_allowlist (phone)
values ('500600700');
```

Możesz też wejść w `Table Editor`, otworzyć tabelę `registration_allowlist`
i dodać rekord ręcznie. Domyślna rola nowego użytkownika to `user`.

## Rejestracja z aplikacji

1. Użytkownik podaje imię, nazwisko, numer telefonu i hasło.
2. Aplikacja czyści numer i sprawdza, czy znajduje się na liście administratora.
3. Aplikacja tworzy email techniczny, na przykład `500600700@app.local`.
4. Supabase Authentication tworzy konto emailowe.
5. Trigger bazy ponownie sprawdza listę, oznacza numer jako zajęty i tworzy
   rekord w tabeli `profiles`.
6. Aplikacja wraca do ekranu logowania.

## Ręczne dodanie administratora

1. Dodaj numer administratora do listy z rolą `admin`:

   ```sql
   insert into public.registration_allowlist (phone, role)
   values ('500600700', 'admin');
   ```

2. Wejdź w `Authentication > Users`.
3. Utwórz użytkownika emailowego:

   ```text
   Email: 500600700@app.local
   Password: ustawione-haslo
   ```

4. Trigger automatycznie utworzy profil z rolą `admin`.
5. Imię i nazwisko możesz uzupełnić w `SQL Editor`:

   ```sql
   update public.profiles
   set first_name = 'Jan', last_name = 'Kowalski'
   where phone = '500600700';
   ```

Nie dodawaj użytkowników przez bezpośredni `insert` do tabeli `auth.users`.

## Reset zapomnianego hasła

W pierwszej wersji aplikacja nie wysyła wiadomości do użytkownika, ponieważ
email techniczny nie ma skrzynki odbiorczej. Administrator ustawia nowe hasło
w panelu `Authentication > Users`.

## Gdy Supabase odrzuca `@app.local`

Domena techniczna jest ustawiana w jednym miejscu. Jeżeli rejestracja zwraca
błąd nieprawidłowego emaila, zmień w `.env`:

```dotenv
VITE_AUTH_EMAIL_DOMAIN=twoja-prawidlowa-domena.pl
```

Następnie zatrzymaj serwer klawiszami `Ctrl+C` i ponownie uruchom:

```powershell
npm run dev
```

Kod aplikacji i struktura bazy nie wymagają wtedy zmian.

## Ręczny test integracyjny

1. Wykonaj aktualny plik `supabase/schema.sql`.
2. Dodaj wolny numer do `registration_allowlist`.
3. Zarejestruj konto tym numerem.
4. Sprawdź, czy w `Authentication > Users` pojawił się email techniczny.
5. Sprawdź, czy tabela `profiles` zawiera numer, email techniczny oraz profil.
6. Zaloguj konto i potwierdź, że HOME pokazuje dane użytkownika.
7. Spróbuj ponownie zarejestrować ten sam numer. Operacja ma zostać zablokowana.

## Testy automatyczne

```powershell
npm test
npm run build
```
