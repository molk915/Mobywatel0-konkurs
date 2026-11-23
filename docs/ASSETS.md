# Pochodzenie zasobów

Portrety w `public/portraits/` powstały narzędziem image_gen na potrzeby tego projektu. Przedstawiają fikcyjne osoby, nie są zdjęciami użytkowników ani osób z referencji. Nie edytowano fotografii z ZIP-a.

Wspólny kierunek promptów: fotorealistyczny portret do fikcyjnego dokumentu demonstracyjnego, twarz na wprost, naturalne światło i skóra, jasnoszare neutralne tło, bez tekstu, godła, logo i prawdziwego dokumentu.

| Plik | Wariant promptu |
|---|---|
| `public/portraits/aleksandra.png` | Fikcyjna Polka, 32 lata, ciemne kasztanowe włosy do ramion, czarny prosty top, spokojny wyraz twarzy. |
| `public/portraits/kacper.png` | Fikcyjny Polak, 20 lat, krótkie falowane brązowe włosy, granatowy prosty top, naturalny wyraz twarzy. |
| `public/portraits/ewa.png` | Fikcyjna Polka, 63 lata, srebrne włosy, granatowa bluzka, spokojny i życzliwy wyraz twarzy. |

Oryginały PNG pozostają w lokalnym katalogu `.codex/generated_images/01a1ea7a-264e-7213-bbd2-fbfe73d5e091`. Kopie używane przez aplikację znajdują się w powyższych ścieżkach. Kadrowanie jest wyłącznie CSS (`object-fit`), bez modyfikowania plików.

Samochód w `src/VehicleArt.tsx` to własna ilustracja bez znaków producenta. Ikony pochodzą z Lucide. Inter Variable jest dostarczany lokalnie z pakietu Fontsource. Rozeta dokumentu w `public/document-lines.svg` powstała na potrzeby projektu.

Zrzuty `reference-*` służą porównaniu w lokalnej dokumentacji, nie są elementami interfejsu ani zasobami publikowanej PWA. Wyłączenia licencyjne referencji opisuje jej README: kod MIT nie obejmuje automatycznie zdjęć, oznaczeń i wyglądu dokumentów.

Ikona `public/icon.svg` wykorzystuje wizerunek orła z dostarczonego ZIP-a referencji (`mockup/assets/icon-mobywatel.svg`) z niebieskim tłem. Pliki PNG ikon PWA są eksportami tego wariantu. Licencje bibliotek dostarczanych w aplikacji są dostępne w `public/THIRD_PARTY_NOTICES.txt`.
