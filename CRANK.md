# Żelazna korba

Zastępuje minigrę z kulami. Rano od drugiego dnia można wybrać korbę zamiast rzeźni. Rozpoczęta praca kosztuje jedną akcję i rozlicza dzienny przydział pracy; nie daje zapłaty. Instrukcja i ładowanie tła nie uruchamiają zegara ani nie kosztują akcji.

## Sterowanie i 30 sekund pracy

Korba obraca się przeciwnie do ruchu wskazówek zegara, zaczynając na godzinie 6. Trzymaj Spację na prawym łuku w górę: 6 → 3 → 12. Puść na lewym łuku w dół: 12 → 9 → 6. Przycisk pod sceną obsługuje ten sam chwyt przez mysz lub dotyk. Nie steruje się już myszką rękami ani chodzeniem.

Równy rytm rozpędza mechanizm i zwiększa tempo kolejnych obrotów. Na godzinie 12 korba czeka na puszczenie Spacji, a na 6 na ponowne naciśnięcie. Przedwczesna zmiana Spacji tylko zatrzymuje ruch; poprawienie chwytu pozwala kontynuować ten sam obrót. Wynik liczy wyłącznie pełne obroty przed dzwonkiem. Norma wynosi 10 obrotów w 30 sekund.

F10 otwiera pauzę: czas, kąt, tempo pozostają zachowane, zwalnia się tylko trzymany klawisz/przycisk. Po wznowieniu trzeba ponownie chwycić korbę. Utrata fokusu czyści ten sam chwyt. Esc kończy rozpoczętą pracę jako przerwaną; wyjście z instrukcji jest bezpłatne.

## Rozliczenie

- Pełny obrót: 2 XP siły i 2 XP wytrzymałości.
- Osiągnięta norma: +2 respektu.
- Przerwana praca: jedna akcja i −1 opinii, bez premii za normę.
- Callback wywoływany jest raz. Po wyniku nie można wybrać drugiej pracy tego dnia; reset i wczytanie nie rozliczają poprzedniej sesji.
- Wykorzystany jest istniejący dzienny znacznik pracy; schemat zapisu pozostaje bez zmian.

## Grafika i moduły

Fotografie użytkownika określają bryłę maszyny: skrzynia z mechanizmem, regulacja oporu, ciężki żelazny postument i boczna korba. Kadr obejmuje głowę, tułów i dłonie oraz mniejszą skrzynię mechanizmu, z pominięciem nóg i podstawy. Górny odcinek ruchu korby biegnie od postaci w stronę skrzyni. Scena korzysta z istniejącego malowanego tła `art/cannonballs/shed.png`. Maszynę i obracające się części rysuje kod. Postać zachowuje wygląd gracza oraz szkielet `cast` / `drawBoxer`; dłonie podążają przez IK za tym samym uchwytem. W widoku z boku dalsze ramię zasłaniają tułów i bliższe ramię, a klatka ma węższy profil. Skrzynia jest pokazana bokiem: okrągłe łożysko leży pośrodku widocznej ściany, a długie ramię korby wychodzi z niego bezpośrednio do dłoni. Ramię ma stałą długość i obraca się o pełne 360° wokół osi łożyska. Uchwyt zatacza okrąg wokół środka skrzynki, a postać stoi bliżej i pochyla tułów przy sięganiu po dalszą połowę obrotu. Ruch ciała i krople potu wynikają z zegara symulacji. Nie dodano nowych warstw PNG.

`crank-rules.js` to czyste, deterministyczne reguły objęte checkJs. `crank.js` jest właścicielem trybu, wejścia, HUD i jednorazowego wyniku. `crank-scene.js` przygotowuje szkielet w jego natywnej rozdzielczości i składa scenę 288×192. `prison` nalicza nagrody i koszt pracy.

`tests/crank.test.js` sprawdza połówki obrotu, przewagę rytmu, wznawianie ruchu po błędnym chwycie, pauzę, liczenie obrotów, dzwonek i determinizm. `tests/crank.mjs` sprawdza wejście przez drzwi, klawiaturę, pauzę, wynik, rozliczenie pracy i reset.

Tempo i norma są wstępnie skalibrowane symulacją; wygodę i trudność rytmu trzeba ocenić w ręcznej grze.
