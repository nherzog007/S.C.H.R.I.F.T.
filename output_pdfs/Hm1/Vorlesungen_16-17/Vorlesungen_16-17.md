# Vorlesungen 16-17: Logarithmus, Allgemeine Potenzen und Trigonometrie

## 1. Der natürliche Logarithmus und seine Eigenschaften

Der natürliche Logarithmus besitzt fundamentale Rechenregeln, die Multiplikation in Addition überführen.

$\forall x, y > 0 \text{ gilt } \ln(x \cdot y) = \ln(x) + \ln(y) \quad \textcolor{#e64c4c}{(*)}$
$\quad \quad \quad \ln\left(\frac{x}{y}\right) = \ln(x) - \ln(y)$

**Beweis der Gültigkeit:**
$\ln(xy) = \ln(x) + \ln(y) \iff_{\substack{\uparrow \\ \text{exp. streng} \\ \text{monoton wachsend}}} e^{\ln(xy)} = e^{\ln(x) + \ln(y)} \overset{\textcolor{#e64c4c}{(1a)}}{\iff} xy = e^{\ln(x)} e^{\ln(y)} \overset{\textcolor{#e64c4c}{(1a)}}{\iff} xy = xy \quad \text{was stimmt.}$

Also stimmt $\ln(xy) = \ln(x) + \ln(y)$.
*Beispiel:* $\ln(15) = \ln(5 \cdot 3) = \ln(5) + \ln(3)$

> [!NOTE]
> Der natürliche Logarithmus bildet das Produkt zweier Zahlen auf die Summe ihrer Logarithmen ab. Diese Eigenschaft resultiert direkt aus der Umkehrung der Potenzgesetze der Exponentialfunktion.

### 1.1 Beispiel 9.2: Nullstellenbestimmung
**Aufgabe:** Zeige $f: (0; \infty) \to \mathbb{R}$ mit $f(x) = \ln x + x$ hat genau eine Nullstelle in $\left(\frac{1}{2} ; \frac{2}{3}\right)$.

**Lösung:**
$f$ ist stetig und streng monoton wachsend, weil $x$ und $\ln(x)$ genau diese Eigenschaften haben.

Untersuchung der Intervallgrenzen:
$$
\left.
\begin{array}{ll}
f(\frac{1}{2}) = \ln(\frac{1}{2}) + \frac{1}{2} < 0 & \textcolor{#e64c4c}{(1)} \\
f(\frac{2}{3}) = \ln(\frac{2}{3}) + \frac{2}{3} \overset{!}{>} 0 & \textcolor{#e64c4c}{(2)}
\end{array}
\right\} \xrightarrow[\text{Zwischenwertsatz}]{f \text{ stetig}} \exists x_0 \in \left(\frac{1}{2} ; \frac{2}{3}\right) \text{ mit } f(x_0) = 0
$$

Überprüfung der Ungleichung $\textcolor{#e64c4c}{(2)}$:
$\textcolor{#e64c4c}{(2)} \iff \ln(\frac{2}{3}) > -\frac{2}{3} \underset{\substack{\uparrow \\ \text{exp streng} \\ \text{monoton wachsend}}}{\iff} e^{\ln(\frac{2}{3})} > e^{-\frac{2}{3}} \overset{\textcolor{#e64c4c}{(1a)}}{\iff} \frac{2}{3} > e^{-\frac{2}{3}} \iff e^{\frac{2}{3}} > \frac{3}{2}$

Potenzieren mit $\frac{3}{2}$ (da $\frac{3}{2} e^{\frac{2}{3}} > 0$):
$\iff (e^{\frac{2}{3}})^{\frac{3}{2}} > (\frac{3}{2})^{\frac{3}{2}} \iff e > (\frac{3}{2})^{\frac{3}{2}}$

Dies ist wahr, da $\left(\frac{3}{2}\right)^{\frac{3}{2}} < \left(\frac{3}{2}\right)^2 = 2,25 < e$. Also stimmt $\textcolor{#e64c4c}{(2)}$.

**Ergebnis:** $\exists x_0 \in (\frac{1}{2}; \frac{2}{3})$ mit $f(x_0) = 0$. Da $f$ streng monoton wachsend ist, ist $f$ injektiv. Also hat $f$ **genau eine** Nullstelle in diesem Intervall.
*(Hinweis: $2,25 < e < 3$ folgt aus der Reihendarstellung $e = \sum \frac{1}{n!}$, was später gezeigt wird.)*

## 2. Die allgemeine Potenz

Die Potenzierung für beliebige Basen $a > 0$ wird auf die natürliche Exponentialfunktion zurückgeführt.

$$
\left.
\begin{array}{l}
\text{Wir wissen: } a^3 = a \cdot a \cdot a \\
\text{aber } \quad a^{\sqrt{2}} = ? \\
\quad \quad \quad a^e = ?
\end{array}
\right\} \text{für } a > 0
$$

**Definition:**
$\forall a > 0$ gilt $a \overset{\textcolor{#e64c4c}{(1a)}}{=} e^{\ln(a)}$. Wir definieren also:
$$a^x = (e^{\ln(a)})^x = e^{x \ln(a)}$$

**Eigenschaften der Abbildung $x \mapsto a^x$:**
*   Sie ist stetig.
*   $a^x > 0 \quad \forall x \in \mathbb{R}$.
*   $a^{x+y} = a^x a^y$
*   $a^{-x} = \frac{1}{a^x}$
*   $\ln(a^x) = \ln(e^{x \ln(a)}) \overset{\textcolor{#e64c4c}{(1a)}}{=} x \ln(a)$
*   $(a^x)^y = a^{xy}$

> [!NOTE]
> Die allgemeine Potenz $a^x$ wird definiert, indem die Basis $a$ mittels $e^{\ln(a)}$ umgeschrieben wird. Dadurch lassen sich alle Eigenschaften der Exponentialfunktion auf beliebige positive Basen übertragen.

### 2.1 Umkehrabbildung: Der Logarithmus zur Basis $a$

Sei $a > 0, a \neq 1$. Die Abbildung $\mathbb{R} \to \textcolor{#4ce6e6}{(0; \infty)}$, $x \mapsto a^x$ ist streng monoton, stetig und bijektiv.

Daraus folgt die Existenz der Umkehrabbildung $\log_a : \textcolor{#4ce6e6}{(0; \infty)} \to \textcolor{#99e64c}{\mathbb{R}}$.

**Definitionen:**
*   $\log_a(a^{\textcolor{#99e64c}{x}}) = \textcolor{#99e64c}{x}$ (denn $a^{\textcolor{#99e64c}{x}} = a^{\textcolor{#99e64c}{x}} \quad \forall x \in \textcolor{#99e64c}{\mathbb{R}}$)
*   $a^{\log_a(y)} = y \quad \forall y \in (0; \infty) \quad \textcolor{#e64c4c}{(3)}$
*   Äquivalenz: $x = \log_a(y) \iff y = a^x$

> [!NOTE]
> Der Logarithmus zur Basis $a$ ($\log_a$) ist die Inverse zur allgemeinen Potenzfunktion $a^x$. Er gibt den Exponenten an, mit dem man $a$ potenzieren muss, um $y$ zu erhalten.

#### Beispiel 9.3 & 9.4: Rechenregeln
*   **Bsp 9.3:** $\log_{10}(\textcolor{#e6994c}{10\,000}) = \textcolor{#99e64c}{4}$, weil $10^{\textcolor{#99e64c}{4}} = \textcolor{#4ce6e6}{10\,000}$.
    *   Anwendung: Bestimmung der Ziffernanzahl $N \in \mathbb{N}$.
    *   $23 \le \log_{10} N < 24 \implies N$ hat 24 Ziffern (z.B. Avogadro-Zahl).
*   **Bsp 9.4:** Seien $x, a > 0, a \neq 1$.
    *   Behauptung: $\log_a(x^{\textcolor{#e6994c}{b}}) = \textcolor{#e6994c}{b} \cdot \log_a(x) \quad \textcolor{#e64c4c}{(4)}$
    *   Beweis: Wende $a^{(\dots)}$ auf beide Seiten an.
        $a^{\log_a(x^{\textcolor{#e6994c}{b}})} = x^{\textcolor{#e6994c}{b}}$ (links) und $a^{\textcolor{#e6994c}{b} \log_a(x)} = (a^{\log_a(x)})^{\textcolor{#e6994c}{b}} = x^{\textcolor{#e6994c}{b}}$ (rechts).

### 2.2 Satz 9.1: Basiswechsel
$\forall a, y \in (0; \infty), a \neq 1$ gilt:
$$\log_a(y) = \frac{\ln(y)}{\ln(a)} \quad \textcolor{#e64c4c}{(5)}$$

**Beweis:**
$\textcolor{#e64c4c}{(5)} \iff \ln(a) \cdot \log_a(y) = \ln(y) \iff e^{\ln(a) \cdot \log_a(y)} = e^{\ln(y)}$
$\overset{\textcolor{#e64c4c}{(3)}}{\iff} (e^{\ln(a)})^{\log_a(y)} = y \overset{\textcolor{#e64c4c}{(3)}}{\iff} a^{\log_a(y)} = y$, was stimmt.

> [!NOTE]
> Der Satz vom Basiswechsel erlaubt die Umrechnung jedes beliebigen Logarithmus in den natürlichen Logarithmus (ln). Dies ist entscheidend für Ableitungen und numerische Berechnungen.

#### Beispiel 9.5 – 9.6: Anwendung des Basiswechsels
*   **Bsp 9.5:** $\log_{10}(e^2) \stackrel{\textcolor{#e64c4c}{(5)}}{=} \frac{\ln(e^2)}{\ln(10)} = \frac{2}{\ln(10)}$
*   **Bsp 9.6:** Zeige $\log_3(\sqrt{11} - \sqrt{2}) = 2 - \log_3(\sqrt{11} + \sqrt{2}) \quad \textcolor{#e64c4c}{(6)}$
    *   Umformung: $\textcolor{#e64c4c}{(6)} \iff \log_3(\sqrt{11} - \sqrt{2}) + \log_3(\sqrt{11} + \sqrt{2}) = 2$.
    *   Hilfssatz aus Formelsammlung $\textcolor{#e64c4c}{(7)}$: $\log_a(x) + \log_a(y) = \log_a(xy)$.
    *   Einsetzen: $\log_3((\sqrt{11} - \sqrt{2})(\sqrt{11} + \sqrt{2})) = 2$
    *   3. Binomische Formel: $\log_3(11 - 2) = \log_3(9) = 2$.
    *   Da $3^2 = 9$, ist die Aussage wahr.

> [!IMPORTANT]
> **Mentifrage:** Bestimme alle Lösungen der Gleichung $\log_2(x) = \log_4(x-2)$!
> Wie viele Lösungen hat sie?
> (1) keine
> (2) eine
> (3) zwei
> (4) unendlich viele
> (5) keine der obigen Antworten
> (6) keine Ahnung.

---

# Trigonometrie und Arkusfunktionen
*Datum: 18.12.23*

## 3. Trigonometrische Funktionen: sin, cos, tan

Definition am Einheitskreis mit Zentrum O:
*   <span style="color:#4ce64c">sin $\varphi$</span> (Grün)
*   <span style="color:#4ce6e6">cos $\varphi$</span> (Blau)

![](Vorlesungen_16-17/Vorlesungen_16-17_p2_Einheitskreis.excalidraw)

Konstruktion für $0 < \varphi < \frac{\pi}{2}$:
$\textcolor{#4ce6e6}{\cos \varphi} = \frac{OB}{\underbrace{OA}_{=1}} = OB$

![](Vorlesungen_16-17/Vorlesungen_16-17_p2_Dreieck_Konstruktion.excalidraw)

> [!NOTE]
> Sinus und Kosinus werden als y- bzw. x-Koordinate eines Punktes auf dem Einheitskreis definiert, der durch den Winkel $\varphi$ festgelegt ist. Diese geometrische Definition ermöglicht die Erweiterung auf beliebige reelle Winkel.

### 3.1 Eigenschaften und Symmetrien
$\forall x \in \mathbb{R}$ gilt:

1.  $\textcolor{#e64c4c}{(i)} \quad \sin(-x) = -\sin(x)$ (ungerade), $\quad \cos(-x) = \cos(x)$ (gerade)
2.  $\textcolor{#e64c4c}{(ii)} \quad \sin(x + \pi) = -\sin(x) , \quad \cos(x + \pi) = -\cos(x)$
3.  $\textcolor{#e64c4c}{(iii)} \quad \sin(x + 2\pi) = \sin(x) , \quad \cos(x + 2\pi) = \cos(x)$ (Periodizität)
4.  $\textcolor{#e64c4c}{(iv)} \quad \sin(\pi - x) = \sin(x) , \quad \cos(\pi - x) = -\cos(x)$
5.  $\textcolor{#e64c4c}{(v)} \quad \sin(x + \frac{\pi}{2}) = \cos(x) , \quad \cos(x + \frac{\pi}{2}) = -\sin(x)$
6.  $\textcolor{#e64c4c}{(vi)} \quad \forall k \in \mathbb{Z} \text{ gilt } \sin(k\pi) = 0 , \quad \cos(k\pi) = (-1)^k$

**Illustrationen:**
Links: Symmetrie bzgl. $x$-Achse. Rechts: Symmetrie zu $\pi$.
![](Vorlesungen_16-17/Vorlesungen_16-17_p2_Symmetrie_Neg_X.excalidraw)
![](Vorlesungen_16-17/Vorlesungen_16-17_p2_Symmetrie_Pi_Minus_X.excalidraw)

### 3.2 Additionstheoreme und Spezielle Werte
**Additionstheoreme:**
*   $\cos(x+y) = \cos x \cos y - \sin x \sin y$
*   $\sin(x+y) = \sin x \cos y + \cos x \sin y$

**Nullstellen:**
*   $\cos x = 0 \iff x = \frac{\pi}{2} + k\pi , \ k \in \mathbb{Z}$
*   $\sin x = 0 \iff x = k\pi , \ k \in \mathbb{Z}$

**Wertetabelle:**

| x | 0 | $\frac{\pi}{6}$ | $\frac{\pi}{4}$ | $\frac{\pi}{3}$ | $\frac{\pi}{2}$ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$\sin x$** | $\frac{\sqrt{0}}{2}=0$ | $\frac{\sqrt{1}}{2}=\frac{1}{2}$ | $\frac{\sqrt{2}}{2}=\frac{1}{\sqrt{2}}$ | $\frac{\sqrt{3}}{2}$ | $\frac{\sqrt{4}}{2}=1$ |
| **$\cos x$** | $\frac{\sqrt{4}}{2}=1$ | $\frac{\sqrt{3}}{2}$ | $\frac{\sqrt{2}}{2}=\frac{1}{\sqrt{2}}$ | $\frac{\sqrt{1}}{2}=\frac{1}{2}$ | $\frac{\sqrt{0}}{2}=0$ |

#### Herleitungen spezieller Werte
1.  **$\sin \textcolor{#e6994c}{\frac{\pi}{4}}$:**
    ![](Vorlesungen_16-17/Vorlesungen_16-17_p3_RightTriangle_Pi4.excalidraw)
    Im gleichschenkligen rechtwinkligen Dreieck gilt $|AB| = a \Rightarrow |AC| = a$.
    Hypotenuse $|BC| = a\sqrt{2}$.
    $\sin \frac{\pi}{4} = \frac{a}{a\sqrt{2}} = \frac{1}{\sqrt{2}}$.

2.  **$\sin \textcolor{#4ce6e6}{\frac{\pi}{3}}$:**
    ![](Vorlesungen_16-17/Vorlesungen_16-17_p3_EquilateralTriangle_Pi3.excalidraw)
    Im gleichseitigen Dreieck ist die Höhe $AM$ auch Seitenhalbierende.
    $|BM| = \frac{a}{2}$. Höhe $|AM| = \sqrt{a^2 - (a/2)^2} = \frac{a\sqrt{3}}{2}$.
    $\sin \frac{\pi}{3} = \frac{|AM|}{|AB|} = \frac{\sqrt{3}}{2}$.

#### Beispiel 9.8: Bestimmung großer Winkel
**Aufgabe:** Bestimme $\cos (\frac{437\pi}{6})$, $\sin (\frac{437\pi}{6})$.

**Lösung mittels $2\pi$-Periodizität:**
1.  Zerlegung: $\frac{437}{12} \cdot 2\pi$.
    $437 : 12 = 36$ Rest $5 \implies 437 = 12 \cdot 36 + 5$.
2.  Substitution: $\frac{437\pi}{6} = 36 \pi + \frac{5\pi}{6} = 18 \cdot (2\pi) + \frac{5\pi}{6}$.
3.  Reduktion: $\cos(\frac{437\pi}{6}) = \cos(\frac{5\pi}{6})$ und $\sin(\frac{437\pi}{6}) = \sin(\frac{5\pi}{6})$.
4.  Berechnung im Standardbereich:
    $\cos (\frac{5\pi}{6}) = \cos(\pi - \frac{\pi}{6}) \stackrel{\textcolor{#e64c4c}{(iv)}}{=} -\cos(\frac{\pi}{6}) = -\frac{\sqrt{3}}{2}$
    $\sin (\frac{5\pi}{6}) = \sin(\pi - \frac{\pi}{6}) \stackrel{\textcolor{#e64c4c}{(iv)}}{=} \sin(\frac{\pi}{6}) = \frac{1}{2}$

## 4. Die Arkusfunktionen (Inverse Trigonometrie)

Da trigonometrische Funktionen periodisch sind, sind sie auf $\mathbb{R}$ **nicht** injektiv. Für die Umkehrfunktionen müssen die Definitionsbereiche eingeschränkt werden.

> [!NOTE]
> Die Arkusfunktionen sind die Umkehrfunktionen der trigonometrischen Funktionen auf eingeschränkten Definitionsbereichen (Hauptzweige). Sie ordnen einem trigonometrischen Wert den entsprechenden Winkel zu.

### 4.1 Arcuscosinus (arccos)
Einschränkung: $\cos: \textcolor{#e64c4c}{[0; \pi]} \to \textcolor{#e6994c}{[-1; 1]}$ ist bijektiv, stetig und streng monoton fallend.
**Umkehrabbildung:** $\arccos: \textcolor{#e6994c}{[-1; 1]} \to \textcolor{#e64c4c}{[0; \pi]}$

![](Vorlesungen_16-17/Vorlesungen_16-17_p3_CosineRestricted.excalidraw)
![](Vorlesungen_16-17/Vorlesungen_16-17_p3_ArccosineCurve.excalidraw)

#### Beispiel 9.9
*   $\arccos(\frac{1}{2}) = \textcolor{#e64c4c}{\frac{\pi}{3}}$, da $\cos(\frac{\pi}{3}) = \frac{1}{2}$ und $\frac{\pi}{3} \in [0, \pi]$.
*   $\arccos(0) = \frac{\pi}{2}$.
*   $\arccos(-1) = \pi$.

<span style="color:#e64c4c; text-decoration:underline">Achtung:</span> $\cos(\frac{7\pi}{3}) = \frac{1}{2}$, aber $\arccos(\frac{1}{2}) \neq \frac{7\pi}{3}$, da $\frac{7\pi}{3} \notin \textcolor{#e64c4c}{[0; \pi]}$.

**Allgemein:** $\cos(a)=b \Leftrightarrow \arccos(b)=a$ gilt nur, wenn $a \in \textcolor{#e64c4c}{[0; \pi]}$.

### 4.2 Arcussinus (arcsin)
Einschränkung: $\textcolor{#4ce6e6}{\sin} : \textcolor{#e64c4c}{[-\frac{\pi}{2}; \frac{\pi}{2}]} \to \textcolor{#e6994c}{[-1; 1]}$ ist bijektiv, stetig und streng monoton wachsend.
**Umkehrabbildung:** $\textcolor{#4ce6e6}{\arcsin} : \textcolor{#e6994c}{[-1; 1]} \to \textcolor{#e64c4c}{[-\frac{\pi}{2}; \frac{\pi}{2}]}$

![](Vorlesungen_16-17/Vorlesungen_16-17_p4_Sinus_Restricted_Graph.excalidraw)
![](Vorlesungen_16-17/Vorlesungen_16-17_p4_Arcsinus_Graph.excalidraw)

*   $\arcsin(0) = 0$.
*   $\arcsin(1) = \frac{\pi}{2}$.
*   $\arcsin(-1) = -\frac{\pi}{2}$.

> [!NOTE]
> **Mentifrage:** Gelten jede der folgenden Gleichheit, $\forall x$, so dass beide Seiten definiert werden?
> (a) $\sin(\arcsin x)=x$
> (b) $\arcsin(\sin x) = x$
> (1) Ja beide, (2) nur (a) (3) nur (b).
> (4) keine der 2, (5) keine Ahnung.

### 4.3 Tangens und Arcustangens

**Tangens:**
$\tan x = \frac{\sin(x)}{\cos(x)}$ für $x \in \mathbb{R} \setminus \{ \frac{\pi}{2} + k\pi \}$.
Geometrisch entspricht $\tan \varphi$ der Streckenlänge $|AB|$ am Einheitskreis.
Grenzwerte: $\lim_{\varphi \to \frac{\pi}{2}-} \tan \varphi = +\infty$, $\lim_{\varphi \to -\frac{\pi}{2}+} \tan \varphi = -\infty$.

![](Vorlesungen_16-17/Vorlesungen_16-17_p4_Unit_Circle_Tangent.excalidraw)
![](Vorlesungen_16-17/Vorlesungen_16-17_p4_Tangent_Graph.excalidraw)

**Arcustangens:**
Einschränkung: $\tan : \textcolor{#e64c4c}{(-\frac{\pi}{2}, \frac{\pi}{2})} \to \textcolor{#e6994c}{\mathbb{R}}$.
Umkehrabbildung: $\arctan : \textcolor{#e6994c}{\mathbb{R}} \to \textcolor{#e64c4c}{(-\frac{\pi}{2}, \frac{\pi}{2})}$.

![](Vorlesungen_16-17/Vorlesungen_16-17_p4_Arctangent_Graph.excalidraw)

#### Beispiel 9.10
*   $\arctan(1) = \frac{\pi}{4}$.
*   $\arctan(0) = 0$.
*   $\lim_{x \to \infty} \arctan x = \frac{\pi}{2}$ und $\lim_{x \to -\infty} \arctan x = -\frac{\pi}{2}$.

## 5. Anwendung: Polardarstellung komplexer Zahlen
*Datum: 19.12.23*

Sei $z = a+bi$ ($a,b \in \mathbb{R}$). Wir suchen $\textcolor{#994ce6}{\varphi \in (-\pi; \pi]}$ so dass $z = |z|(\cos\textcolor{#994ce6}{\varphi} + i\sin\textcolor{#994ce6}{\varphi})$.
Dann ist $\arg z = \textcolor{#994ce6}{\varphi}$.

![](Vorlesungen_16-17/Vorlesungen_16-17_p5_ComplexPlane_Z_Phi.excalidraw)

Es gilt $\cos\textcolor{#994ce6}{\varphi} = \frac{a}{|z|} = \frac{a}{\sqrt{a^2+b^2}}$.
**Problem:** Man kann nicht immer einfach $\arccos$ anwenden, da $\arccos$ in $[0; \pi]$ abbildet, aber $\varphi$ auch in $(-\pi; 0)$ liegen kann.

**Fallunterscheidung:**

| Bedingung für Imaginärteil $b$ | Berechnung von $\varphi$ |
| :--- | :--- |
| **Fall 1:** $b \ge 0$ | $\textcolor{#994ce6}{\varphi} \in [0;\pi] \implies \textcolor{#994ce6}{\varphi} = \arccos(\frac{a}{\sqrt{a^2+b^2}})$ |
| **Fall 2:** $b < 0$ | $\textcolor{#994ce6}{\varphi} \in (-\pi; 0) \implies \textcolor{#994ce6}{\varphi} = -\arccos(\frac{a}{\sqrt{a^2+b^2}})$ |

> [!NOTE]
> Zur Bestimmung des Arguments $\varphi$ einer komplexen Zahl wird der Realteil und der Betrag im Arcuscosinus verwendet. Da der Arcuscosinus nur Werte zwischen 0 und $\pi$ liefert, muss für komplexe Zahlen mit negativem Imaginärteil das Vorzeichen des Winkels manuell korrigiert werden.

### 5.1 Beispiel 9.11
1.  **Zahl:** $z = \sqrt{3} + 3i$
    *   $b = 3 \ge 0$ (Fall 1).
    *   $\textcolor{#994ce6}{\varphi} = \arccos(\frac{\sqrt{3}}{\sqrt{3 + 9}}) = \arccos(\frac{\sqrt{3}}{\sqrt{12}}) = \arccos(\sqrt{\frac{1}{4}}) = \arccos(\frac{1}{2})$.
    *   $\arg z = \textcolor{#994ce6}{\frac{\pi}{3}}$.

2.  **Zahl:** $z = 1 - i$
    *   $b = -1 < 0$ (Fall 2).
    *   $\textcolor{#994ce6}{\varphi} = -\arccos(\frac{1}{\sqrt{1+1}}) = -\arccos(\frac{1}{\sqrt{2}})$.
    *   $\arg z = \textcolor{#994ce6}{-\frac{\pi}{4}}$.