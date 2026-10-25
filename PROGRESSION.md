# Rozwój w Newgate

Aktualny zakres po porządkach z 2026-10-03 i Cechach z 2026-10-18. Reguły i liczby są w `stats.js`, `training-data.js`, `perk-rules.js` oraz `card-data.js`; historyczny projekt obejmujący siłownię jest w kopii poza Roadwork.

## Poziomy i XP

Trzy drzewka to Siła, Szybkość i Wytrzymałość. Krzywa pozostaje `10 * round(4 + L^1.65)`, skala danych 1–30. W obecnym akcie każde drzewko zatrzymuje się na poziomie 15. Nadwyżka jest zachowana w `prison.bank` do wysokości jednego poziomu; nie ma obecnie wyjścia na wolność ani wypłaty tej puli. Na poziomie 10 awans czeka na próbę Profesora, z oddzielnym bankiem `stats[k].banked`.

XP nalicza się za wynik całej sesji, a nie za klikanie pojedynczych ciosów. Sesje zachowują oceny S/A/B/C/D, stopnie, mnożnik wyzwania, potrzeby i świeżość dzienną: 100/100/80/60/40%. Przerwanie wykonanej części daje połowę jej XP; pusta sesja nie daje nagrody.

| Źródło | Rozdział bazowego XP |
| --- | --- |
| Pompki | 65% siła, 35% wytrzymałość |
| Podciąganie na kracie | 70% siła, 30% wytrzymałość |
| Karaluchy na ścianie | 10% siła, 65% szybkość, 25% wytrzymałość |
| Cień | 65% szybkość, 35% wytrzymałość |
| Cień z Profesorem | 25% siła, 55% szybkość, 20% wytrzymałość |
| Praca w rzeźni | 55% siła, 45% wytrzymałość |
| Bójka kartami | Wszystkie drzewka; wynik, ranga rywala, PERFECT i dzienna świeżość |

Próby Profesora: Siła — pompki III na A/S; Szybkość — Cień z Profesorem III na A/S; Wytrzymałość — wygrana z rywalem co najmniej ★★ na spacerniaku przy zachowaniu wymaganej kondycji. Próby współczesnego trenera zostały usunięte.

## Cechy, punkty i ciosy

Na poziomach 5, 10 i 15 każdego atrybutu gracz wybiera jedną z dwóch Cech (`TRAITS` w `skill-data.js`, projekt w `PERKI.md`). Cechy działają zawsze, bez punktów i slotów; ich działanie w bójce określa `PERK_CARDS`. Wolne miejsce wybiera się za darmo w karcie postaci. Wybraną Cechę zmienia się u Profesora: pierwsza zmiana w atrybucie za darmo, kolejne po 5 prymek. Brak tytoniu nie zmienia wyboru ani czasu.

Punkty pochodzą z awansów, prób i lekcji. Opłacają tylko ruchy i drzewka ciosów swojego atrybutu (`MOVES`, `PUNCH_TREES` w `card-data.js`): Szybkość — jab, jab na korpus, hook; Siła — cross, uppercut, podbródkowy w żołądek; Wytrzymałość — prosty na splot, hak na wątrobę, Nerki. Węzeł drzewka kosztuje 1 punkt na poziomach I–III i 2 na IV–V; kupuje się go dopiero, gdy działa w bójce (`NODE_READY`). Monety nie są walutą rozwoju.

Każdy atrybut działa w bójce sam z siebie: Siła — moc i zamroczenie, Wytrzymałość — zdrowie i kondycja, Szybkość — okno uniku +1 tyknięcie na poziomach 5, 10 i 15 oraz remisy tempa (po zapasie kondycji).

Spacerniak korzysta z osobnych punktów: rangi respektu, niedzielne bicie i lekcja Profesora. Wykupione perki są zawsze aktywne, bez slotów. Brudna robota (Łokieć, Z byka) przeszła tu z drzewka Siły. Zmiana buildu kosztuje 20 prymek.

## Zgodność

Schemat zapisu v6 i istniejące klucze pozostają. Dawne poziomy, punkty, rekordy oraz historyczny bilans sparingów są zachowane. Faza `free` przy wczytaniu wraca do Newgate. Dawne monety i dane sprzętu są tolerowane przez walidator, lecz nie mają czynnej ekonomii ani menu.
