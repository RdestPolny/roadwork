Zaprojektowanie i wdrożenie realistycznej rutyny wędkarza na pomoście jako stałego elementu gry Roadwork, obejmującej cykl łowienia ryb, interakcje z wiadrem, przerwę fizjologiczną oraz zachowanie kota podkradającego rybę.

Working directory: /Users/marcinek/Documents/Roadwork
Integrity mode: development

## Requirements

### R1. Rutyna wędkarza na pomoście
Wędkarz łowi ryby na pomoście i odkłada złowione ryby do stojącego obok wiadra. Co pewien czas wędkarz odkłada wędkę, przechodzi kawałek dalej na pomoście, aby oddać mocz, po czym wraca na stanowisko i wznawia łowienie.

### R2. Wizualne zachowanie wiadra z rybami
Wiadro przechowuje ryby złowione przez wędkarza. Ryby znajdujące się w wiadrze wykazują czysto wizualny efekt chlupotania (animacja ruchu wody / kropel / bąbli), bez konieczności odtwarzania efektów dźwiękowych. Stan wiadra odzwierciedla liczbę ryb (zwiększa się przy złowieniu, zmniejsza po kradzieży).

### R3. Rutyna kota na pomoście
Kot przebywający na pomoście początkowo siedzi i obserwuje wędkarza. W momencie, gdy wędkarz odkłada wędkę i odchodzi załatwić potrzebę, kot korzysta z okazji: podbiega/podchodzi do wiadra, wyciąga jedną rybę, ucieka z nią na skrzynię, zjada rybę na skrzyni, a następnie wraca na swoją pozycję na pomoście i ponownie obserwuje rybaka.

### R4. Zgodność z silnikiem i architekturą Roadwork
Implementacja nowych animacji i zachowań obiektów (wędkarz, wędka, wiadro, ryby, kot, skrzynia) musi wykorzystywać istniejący w projekcie mechanizm renderowania na canvasie oraz wpisywać się w architekturę i pętlę aktualizacji stanu gry.

### R5. Weryfikacja zautomatyzowana
Poprawność cyklu rutyny wędkarza, reakcji wiadra oraz zachowania kota musi zostać zweryfikowana zautomatyzowanym testem w przeglądarce (`npm run test:browser`), potwierdzającym przejścia między wszystkimi stanami rutyny bez regresji dotychczasowych testów.

## Acceptance Criteria

### Rutyna wędkarza
- [ ] Wędkarz wykonuje pętlę łowienia: zarzucenie/trzymanie wędki, wyciągnięcie ryby, włożenie ryby do wiadra.
- [ ] Co określony czas wędkarz odkłada wędkę, przemieszcza się w dalszą część pomostu, wykonuje animację oddawania moczu i wraca do wędki.
- [ ] Przejścia stanów wędkarza są płynne i poprawnie sterowane czasem gry.

### Wiadro i efekt ryb
- [ ] Wiadro gromadzi ryby wkładane przez wędkarza.
- [ ] W wiadrze z rybami odtwarzany jest wizualny efekt chlupotania (ruch cząsteczek wody/bąbli).
- [ ] Licznik lub stan zawartości wiadra poprawnie zmniejsza się po zabraniu ryby przez kota.

### Rutyna kota
- [ ] Kot rozpoczyna akcję podkradania wyłącznie wtedy, gdy wędkarz oddalił się od wędki i wiadra.
- [ ] Kot przemieszcza się do wiadra, zabiera jedną rybę i przemieszcza się na skrzynię.
- [ ] Kot na skrzyni odtwarza animację jedzenia ryby, po czym wraca na swoją pierwotną pozycję obserwacyjną na pomoście.

### Integralność techniczna i weryfikacja
- [ ] Wszystkie elementy wizualne są renderowane zgodnie z istniejącą konwencją Roadwork (kod rysujący / canvas).
- [ ] Dedykowany test przeglądarkowy uruchamiany przez `npm run test:browser` sprawdza przejścia stanów wędkarza i kota (łowienie -> odejście wędkarza -> kradzież przez kota -> powrót).
- [ ] Istniejące testy projektu (`npm test` oraz `npm run test:browser`) przechodzą pomyślnie.
