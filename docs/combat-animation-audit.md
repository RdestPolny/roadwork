# Roadwork — audyt anatomii i animacji walki (31.10.2026)

Zakres: wspólny izometryczny rig **432×288**: gracz, Harry, Edmund „The Bull” Briggs, reszta przeciwników oraz sparingowi NPC Wardu. Analiza dotyczy kodu funkcji `fighterJoints`, `figureHD`, `solveLimb`, `strikeArmTargets`, krzywych `PT` i `bodyHitMotion`. Cień (`animation.js`) to **osobna animacja boczna** i nie jest zmieniony. Zasięg, hitboxy, AI, stamina, obrażenia i sygnały trafienia pozostają bez zmian.

## Wnioski z audytu (stan przed zmianami)

- IK miał stałe długości `ARM_U=3.0`, `ARM_L=3.75`, ale cel pięści był oparty na absolutnej pozycji przed zawodnikiem (`DRIVE.fist`), a bark niezależnie obracał się i przesuwał podczas ciosu. Powodowało to okresowo **nieosiągalne cele** oraz widoczne przycinanie pięści przez IK. To problem kierowania celem, nie brak blokady długości kości.
- Hook opierał się na ogólnym `pole` i absolutnym `fist`. **Nie miał gwarancji**, że łokieć znajdzie się na wysokości barku ani że ramię i przedramię utworzą kąt bliski 90°. Zależnie od rotacji i strony ciała płaszczyzna uderzenia mogła być skośna.
- Uppercut opuszczał pięść w środku animacji, ale końcowa wysokość była absolutna i mogła wymuszać nietypowy kierunek przedramienia. Był bardziej „ręką podniesioną w górę” niż zwartym uderzeniem z wybicia nogami.
- Modyfikator uderzenia w korpus obniżał całą miednicę dodatkowo o `2.2` jednostki, co dawało nadmierne przysiady i ostre zgięcia w kolanach.
- Parametr uniesienia pięty podnosił **cały punkt stopy**; stopa potrafiła odklejać się od podłogi mimo fazy podporu.
- Odruch na uderzenie w brzuch ma już osobny przegub `J.abd` i opóźnienie nóg. Przy bardzo silnym trafieniu zgięcie wizualne mogło być zbyt głębokie; amplitudę samej wizualizacji ograniczono bez ingerencji w obrażenia.

## Ocena faz i korekty

| Ruch | Start / przygotowanie | Środek / przyspieszenie | Kontakt / zakończenie | Wdrożona korekta |
| --- | --- | --- | --- | --- |
| **Garda** | Stopa prowadząca wysunięta, obie pięści przed twarzą; łokcie poniżej barków. | Powrót do gardy po zakończeniu cyklu, bez skoku kości. | Podczas ochrony `gUp` pięści zakrywają głowę. | Wspólna wysokość spoczynkowa zachowana; nie ma podskoku podczas bezczynności. |
| **Jab** | Krótka praca przedniego barku, nie odrzucać pięści daleko za siebie. | Wyprost po linii bark–cel, łokieć nadal lekko zgięty. | Bez przeprostu, przeciwną rękę trzymać przy głowie; szybka retrakcja. | Cel przesunięty do aktualnego barku; zasięg docelowy poniżej sumy długości kości. |
| **Cross** | Obrót tylnego biodra, przednia pięść asekuruje. | Kinetic chain: pięta → biodro → bark → pięść; łokieć na zewnątrz, bez nienaturalnego wygięcia w bok. | Mocny prosty, ale nie całkowicie prostowane łokcie, bark chroni brodę. | Rotacja pozostała, punkt pięści jest barkowy; stopa podporowa nie wisi w powietrzu. |
| **Hook** | Kompaktowe podciągnięcie pięści, miękkie kolana, bez wielkiego zamachu. | Ramię otwiera się na bok, bark i biodro obracają się z ciałem; łokieć unosi się do barku. | **Kąt łokcia ≈92°**, bark–łokieć i łokieć–pięść poziome (wysoki hook); powrót do gardy po łuku. | Geometria wysokości `z` ręki równa barkowi na kontakcie, punkt „pole” skierowany na zewnątrz, podniesienie barku i krótsze ugięcie nóg. |
| **Uppercut** | Ugięcie nóg, pięść blisko tułowia, nie za plecami. | Łokieć utrzymany pod ręką, pięść idzie z dołu po krótkim łuku; nie prostować ręki jak przy jabbie. | Pięść blisko pionowej linii ciała, łokieć nadal zgięty; płynne zejście do gardy. | Łuk i przegub określone lokalnie od barku; komora niżej podczas przygotowania, krótkie wybicie do góry. |
| **Ciosy na korpus** | Obniżyć środek ciężkości **kolanami**, nie tylko biodrami i szyją. | Cel pięści na wysokości żeber / splotu słonecznego. | Łokcie nie przechodzą przez tułów; unikać upadania w głęboki przysiad. | Zmiana dodatkowego obniżenia miednicy `2.2 → 0.8` i barkowe cele na korpus. |
| **Reakcja na trafienie** | Mięśnie brzucha kurczą się jako pierwsze. | Zgięcie w prawdziwym przegubie brzucha `J.abd`, potem amortyzacja kolan i osłona łokci. | Powrót do gardy bez teleportacji. | Bez zmiany krzywych i HP; ograniczenie wizualnego `fold` do `1.15`. |

## Geometria i ograniczenia

- Górne ramię: **3.00** jednostki; łokieć–pięść: **3.75** (renderer dzieli ten drugi odcinek w proporcji 80% przedramię / 20% dłoń). Nie zmieniamy wymiarów w trakcie animacji.
- Hook przy kontakcie i trafieniu w głowę: wektor bark → cel pięści to `[+4.85, -0.63 × side, 0]`; preferencja łokcia `[+2.20, +2.04 × side, 0]`. Solver dopasowuje dokładnie długości obu kości, zachowując zgięcie ≈90° i płaszczyznę poziomą.
- Jab i cross na końcu mają docelową odległość od barku krótszą od `3+3.75=6.75`; to eliminuje wymuszony clamp pozycji przy normalnym kontakcie.
- W wariancie **low hook** poziomy wysoki łokieć nie jest regułą: cel schodzi pod bark w stronę żeber, zgięcie pozostaje zwarte.
- Uniesienie pięty to teraz mały przechył **bryły buta**, nie podnoszenie stopy i kostki niezależnie od kroku.
- Prezentacja głowy/twarzy pozostaje lekko przerysowana dla czytelności przy 432×288. Nie zmniejszano modelu, ubrań ani cech indywidualnych rywali.

## Weryfikacja

Automatycznie: `node --test tests/combat-anatomy.test.js` (długości dwóch kości w obu rękach, każdy cios wysokim i niskim celem w fazach od 0 do 1; prawidłowa wysokość i kąt hooka; trajektoria uppercuta; brak utraty zasięgu po przesunięciu barku). Następnie `npm test`, `npm run check`.

Wizualnie po uruchomieniu gry: `/?debug=1` → Opcje → **HD Fight Test — Bohater vs Harry (432×288)**. Przetestować F8 (pauza), kropkę (pojedyncza klatka), F9 (PNG), R (restart), oba kierunki, jab/cross/hook/uppercut, LPM+każdy cios, dash+cios i trafienie w brzuch. W szczególności zapisać trzy klatki dla każdego ciosu: **guard / ładowanie (ok. 40–60% dojścia do kontaktu) / kontakt**, plus pierwszą klatkę powrotu. Testować też Edmunda (ciężki model), w łaźni i na nabrzeżu. Sytuacje wymagające ręcznej oceny: przecięcia ramion z twarzą/ubraniem, widok przy różnych kierunkach, stopy w zwarciu, nakładanie szczytów dwóch animacji.

**Status walidacji:** testy jednostkowe pomocnika można wykonać bez przeglądarki. Pełny przegląd klatek 432×288 oraz regresja gry w przeglądarce nadal wymagają uruchomienia Roadwork (nie są potwierdzone samą analizą kodu).
