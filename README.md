# KROLL PWA

Pierwsza wersja aplikacji pracownika KROLL. Zawiera logowanie, rejestrację przez
numer telefonu i hasło oraz bazowy ekran HOME. Karty modułów na HOME są
przygotowane pod dalszy rozwój i na tym etapie nie otwierają nowych ekranów.
Administrator ma dodatkowo dostęp do panelu administratora oraz zarządzania
komunikatami widocznymi w sekcji `Aktualne informacje`.

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
- tabelę `announcements` z komunikatami,
- tabelę `cities` z miastami,
- tabelę `work_orders` pozostawioną jako starszy fundament pod zlecenia,
- tabele `import_batches`, `import_sheets` i `imported_orders` dla importu XLSX,
- tabele `orders`, `order_items` i `order_photos` dla właściwych zleceń,
- prywatny bucket Storage `order-photos` na zdjęcia zleceń,
- funkcję `get_cities_with_stats()` do pobierania miast ze statystykami,
- funkcję `get_order_public_items()` do bezpiecznego pokazania pozycji zleceń użytkownikom,
- funkcję sprawdzającą numer przed rejestracją,
- trigger tworzący profil,
- polityki RLS dla profili, komunikatów, miast, importów i zleceń.

Tabela `profiles` celowo nie ma pola `shift_code`.

## Aktualne informacje

Sekcja `Aktualne informacje` na HOME pokazuje komunikaty z tabeli
`announcements`. Najnowsze komunikaty są wyświetlane na górze.

Każdy zalogowany użytkownik może czytać komunikaty. Dodawać, edytować i usuwać
może tylko użytkownik z rolą `admin` w tabeli `profiles`.

Admin dodaje komunikaty w aplikacji:

1. Zaloguj się jako administrator.
2. Kliknij `Panel Administratora`.
3. Kliknij `DODAJ KOMUNIKAT`.
4. Wpisz `Tytuł` i `Treść`.
5. Kliknij `Dodaj komunikat`.

Na tym samym ekranie administrator może edytować lub usuwać istniejące
komunikaty.

## Zarządzanie zleceniami i miastami

Administrator zarządza miastami w aplikacji:

1. Zaloguj się jako administrator.
2. Kliknij `Panel Administratora`.
3. Kliknij `ZARZĄDZAJ ZLECENIAMI`.
4. Kliknij `Dodaj Miasto`.
5. Wpisz nazwę miasta i kliknij `DODAJ MIASTO`.

Aplikacja blokuje duplikaty nazw miast niezależnie od wielkości liter. Karty
miast pokazują liczbę wszystkich i zrealizowanych właściwych zleceń z tabeli
`orders`. Usunięcie miasta z przypisanymi importami lub zleceniami jest
blokowane.

## Import XLSX

Administrator importuje zlecenia w aplikacji:

1. Zaloguj się jako administrator.
2. Kliknij `Panel Administratora`.
3. Kliknij `ZARZĄDZAJ ZLECENIAMI`.
4. Kliknij `Importuj Zlecenia`.
5. Wybierz miasto, wpisz nazwę importu, wybierz typ tabeli i wskaż plik XLSX.
6. Kliknij `IMPORTUJ`.

Plik XLSX jest odczytywany w przeglądarce przez fork SheetJS `@e965/xlsx`.
Jeden plik jest zapisywany jako `import_batches`, każdy arkusz jako
`import_sheets`, a pozycje robocze jako `imported_orders`.

Po imporcie aplikacja pokazuje szczegóły importu i karty arkuszy. Po kliknięciu
`Otwórz arkusz` wyświetlane są wyłącznie pozycje z tego jednego arkusza. Pozycje
robocze można wyszukiwać i edytować w modalu.

## Tworzenie zleceń

Administrator tworzy właściwe zlecenia z pozycji roboczych po imporcie:

1. Kliknij `Panel Administratora`.
2. Kliknij `ZARZĄDZAJ ZLECENIAMI`.
3. Kliknij `Twórz Zlecenia`.
4. Wybierz miasto, import i arkusz.
5. Zaznacz jedną lub kilka pozycji roboczych.
6. Kliknij `Utwórz zlecenie`, uzupełnij opis, uwagi i status.

Ekran pracuje na tabeli `imported_orders`, niezależnie od typu pliku XLSX.
Edycja komórki przy wielu zaznaczonych wierszach aktualizuje tę samą kolumnę w
każdym zaznaczonym wierszu. Ukrywanie kolumn dotyczy tylko widoku. Usunięcie
wiersza w polu roboczym jest miękkie: aplikacja ustawia `is_removed = true`, a
rekord pozostaje w Supabase.

Po zatwierdzeniu aplikacja zapisuje właściwe zlecenie w `orders` i powiązania z
pozycjami roboczymi w `order_items`.

## Zlecenia, zdjęcia i mapa

Kafelek `Zlecenia` na HOME otwiera listę właściwych zleceń. Administrator może
edytować zlecenie, przypisać użytkownika, dodać ręcznie współrzędne GPS i dodać
zdjęcia. Zwykły użytkownik widzi listę zleceń bez danych wrażliwych z importu i
może oznaczyć zlecenie jako wykonane przez przycisk `ZREALIZOWANO`.

W karcie zlecenia użytkownik widzi bezpieczne pola pozycji z importu: `ADRES`,
`ZAKRES PRAC`, `GATUNEK`, `OBWÓD` i `ILOŚĆ`. Kliknięcie adresu otwiera
nawigację w Google Maps dla zapytania `miasto + adres`. Ten link korzysta z
Google Maps URLs i nie wymaga klucza API.

Po kliknięciu `ZREALIZOWANO` użytkownik może dodać uwagi po realizacji i zdjęcia.
Aplikacja ustawia status `completed`, zapisuje `completed_at` i dodaje zdjęcia
do bucketu `order-photos`.

Kafelek `Mapa` pokazuje zlecenia z uzupełnionym GPS na mapie OpenStreetMap.
Aktywne zlecenia mają czerwone pinezki, a zrealizowane zielone. Zlecenia bez GPS
pozostają na liście, ale nie pojawiają się na mapie.

Jeśli bucket `order-photos` nie istnieje po wykonaniu SQL, utwórz go ręcznie w
`Storage > Buckets` jako prywatny bucket i dopuszczalne typy plików:
`image/jpeg`, `image/png`, `image/webp`.

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
8. Zaloguj konto admina, dodaj komunikat i potwierdź, że pojawia się w sekcji
   `Aktualne informacje`.

## Testy automatyczne

```powershell
npm test
npm run build
```
