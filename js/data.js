// Higgs Bozonu Çalışma Programı v2 — program verisi
window.PROGRAM = {
  startDate: "2026-11-23", // Pazartesi
  endDate: "2027-05-02",

  phases: [
    { id: 1, name: "Matematik temeli", short: "Matematik", weeks: [1, 8], color: "#2a78d6",
      desc: "Lineer cebiri bitir, kuantumun ihtiyaç duyduğu karmaşık lineer cebire geç, çok değişkenli kalkülüs ve diferansiyel denklemleri öğren, olasılığın temelini at.",
      checks: [
        "3×3 bir matrisin özdeğer ve özvektörlerini elle bulmak",
        "Hermitsel matrisin ne olduğunu açıklamak",
        "İki katlı bir integrali kutupsal koordinatlarda almak",
        "Harmonik osilatör denklemini çözmek",
        "Poisson ve Gauss dağılımlarını ve kovaryansı açıklamak"
      ] },
    { id: 2, name: "Fizik köprüsü", short: "Fizik köprüsü", weeks: [9, 13], color: "#eb6834",
      desc: "Kuantuma geçmeden önce dalgaları, elektromanyetizmayı ve özel göreliliği oturt. Bu fazın sonunda istatistikte fit yapmayı öğreniyorsun.",
      checks: [
        "Yüklü parçacığın manyetik alandaki yarıçapından momentumunu hesaplamak",
        "Dört-vektörlerle değişmez kütle hesaplamak",
        "Bir veriye fit yapıp ki-kare ile yorumlamak"
      ] },
    { id: 3, name: "Kuantum mekaniği ve çekirdek", short: "Kuantum", weeks: [14, 17], color: "#1baf7a",
      desc: "Faz 1'deki matematiğin karşılığını burada alıyorsun: Schrödinger denklemi bir diferansiyel denklem, ölçüm ise bir özdeğer problemi.",
      checks: [
        "Sonsuz kuyuyu ve harmonik osilatörü çözmek",
        "Ölçümü özdeğer problemi olarak açıklamak",
        "Spin ve fermiyon/bozon farkını anlatmak",
        "Radyoaktif bozunma yasasını türetmek"
      ] },
    { id: 4, name: "Parçacık fiziği", short: "Parçacık", weeks: [18, 20], color: "#6250d6",
      desc: "Standart Model'i ve parçacık fizikçilerinin kullandığı dili öğreniyorsun. Veri tarafında Higgs analizine başlıyorsun.",
      checks: [
        "Standart Model'i gruplarıyla anlatmak",
        "Basit Feynman diyagramlarını okumak",
        "Tesir kesiti ve ışınlıktan olay sayısı hesaplamak",
        "Gerçek veride Z tepesini bulup fit etmek"
      ] },
    { id: 5, name: "Higgs", short: "Higgs", weeks: [21, 23], color: "#e34948",
      desc: "Higgs mekanizmasını kavramsal olarak anla, ölçümü veride yeniden yap, istatistiksel anlamlılığı hesapla ve sonucu raporla.",
      checks: [
        "Higgs mekanizmasını kavramsal olarak anlatmak",
        "H → ZZ → 4ℓ analizini baştan sona açıklamak",
        "5 sigmanın anlamını açıklamak",
        "Kendi Higgs grafiğini çizmiş ve raporlamış olmak"
      ] }
  ],

  weeks: [
    { n: 1, phase: 1, topic: "Lineer cebir: vektörler, matris çarpımı, determinant, ters matris",
      reading: "3B1B lineer cebir 1–7; Strang ders 1–4",
      python: "Python ve Jupyter kurulumu; değişken, liste, döngü, fonksiyon",
      question: "Bir matris bir vektöre ne yapar? Geometrik olarak anlat." },
    { n: 2, phase: 1, topic: "Özdeğer ve özvektör, köşegenleştirme, baz değişimi",
      reading: "3B1B 13–14; Strang ders 21–22; elle 2×2 ve 3×3 örnekler",
      python: "NumPy: matris işlemleri, np.linalg.eig ile sonuçlarını kontrol et",
      question: "Özvektör neden özel bir yön? 2×2 bir matrisin özdeğerlerini elle bul." },
    { n: 3, phase: 1, topic: "Karmaşık sayılar, Euler formülü; karmaşık vektörler, iç çarpım, Hermitsel ve üniter matrisler",
      reading: "Strang ders 26 (karmaşık matrisler); kalkülüs kitabının karmaşık sayı eki",
      python: "NumPy'da karmaşık sayılar; e^{iθ}'yı birim çemberde çiz",
      question: "Hermitsel bir matrisin özdeğerleri neden hep gerçek sayı? (Kuantumda ölçüm sonuçlarının gerçek olmasının sebebi bu.)" },
    { n: 4, phase: 1, topic: "Çok değişkenli kalkülüs: kısmi türev, gradyan, çok katlı integral, kutupsal ve küresel koordinatlar",
      reading: "Kalkülüs kitabı, ilgili bölümler; 15 problem",
      python: "Matplotlib ile iki değişkenli fonksiyonun kontur grafiği",
      question: "Küresel koordinatlarda hacim elemanı neden r² sin θ dr dθ dφ?" },
    { n: 5, phase: 1, topic: "Diferansiyel denklemler: 1. ve 2. derece lineer denklemler, harmonik osilatör, değişkenlere ayırma",
      reading: "Dif. denk. kitabı; 15 problem",
      python: "SciPy solve_ivp ile harmonik osilatörü sayısal çöz, analitik çözümle karşılaştır",
      question: "Sönümlü osilatörün üç davranışı nedir? Karakteristik denklemden nasıl çıkar?" },
    { n: 6, phase: 1, topic: "Olasılık I: koşullu olasılık, Bayes, rastgele değişken, beklenen değer, varyans; binom, Poisson, Gauss, üstel dağılım",
      reading: "Cowan, Bölüm 1–2; 15 problem",
      python: "NumPy ile rastgele sayı üret, her dağılımın histogramını çiz",
      question: "Bir sayım deneyinde neden Poisson çıkar? Sayımın hatası neden √N?",
      review: true },
    { n: 7, phase: 1, light: true, topic: "Final haftası (10 saat): Lineer cebir ve kalkülüs tekrarı",
      reading: "Kendi notların; işaretlediğin sorular",
      python: "—",
      question: "Faz 1'in ilk 5 sınama sorusunu tekrar cevapla." },
    { n: 8, phase: 1, light: true, topic: "Final haftası (10 saat): Olasılık II: ortak dağılım, kovaryans, korelasyon, merkezi limit teoremi",
      reading: "Cowan, Bölüm 1 (kovaryans kısmı)",
      python: "Merkezi limit teoremini simülasyonla göster (hafif)",
      question: "Faz 1 kontrolü (Faz sonu kontrolleri sekmesi)", phaseEnd: true },
    { n: 9, phase: 2, topic: "Salınımlar ve dalgalar; elektrostatik: Coulomb yasası, elektrik alan, potansiyel",
      reading: "Serway, dalgalar ve elektrik alan bölümleri; 15 problem",
      python: "Duran dalga ve iki dalganın girişimini animasyonla göster",
      question: "Girişim neden dalgaya özgü bir davranış? Elektrik potansiyeli ile alan arasındaki ilişki ne?" },
    { n: 10, phase: 2, topic: "Manyetizma: Lorentz kuvveti, yüklü parçacığın manyetik alandaki hareketi; elektromanyetik dalgalar, Maxwell denklemleri (kavramsal)",
      reading: "Serway, manyetik alan ve EM dalga bölümleri; 15 problem",
      python: "Manyetik alandaki yüklü parçacığın sarmal yörüngesini simüle et",
      question: "Bir dedektör, parçacığın izinin eğriliğinden momentumunu nasıl ölçer? (p = qBr)" },
    { n: 11, phase: 2, topic: "Özel görelilik: Lorentz dönüşümü, zaman genişlemesi, enerji-momentum ilişkisi",
      reading: "Serway, görelilik bölümü; 15 problem",
      python: "Göreli ve klasik momentumu hız fonksiyonu olarak çiz",
      question: "E² = (pc)² + (mc²)² nereden gelir? Kütlesi sıfır bir parçacığın momentumu olabilir mi?" },
    { n: 12, phase: 2, topic: "Dört-vektörler, değişmez kütle, bozunum kinematiği",
      reading: "Griffiths EP, Bölüm 3; problemlerden 8 tane",
      python: "İki parçacığın dört-vektöründen değişmez kütleyi hesaplayan fonksiyon",
      question: "Z → μμ bozunumunda iki müonun değişmez kütlesi neden hep ~91 GeV çıkar?" },
    { n: 13, phase: 2, topic: "İstatistik II: tahmin ediciler, maksimum olabilirlik, en küçük kareler, ki-kare",
      reading: "Cowan, Bölüm 5–7; 10 problem",
      python: "Gauss dağılımına curve_fit ile fit; ki-kare değerini hesapla ve yorumla",
      question: "Faz 2 kontrolü (Faz sonu kontrolleri sekmesi)", phaseEnd: true, review: true },
    { n: 14, phase: 3, topic: "Dalga fonksiyonu, olasılık yorumu, Schrödinger denklemi, sonsuz kuyu",
      reading: "Griffiths KM, Bölüm 1 ve Bölüm 2'nin başı; 10 problem",
      python: "Sonsuz kuyunun ilk dört durumunu ve olasılık yoğunluklarını çiz",
      question: "Dalga fonksiyonunun karesi neden bir olasılık yoğunluğu?" },
    { n: 15, phase: 3, topic: "Harmonik osilatör, tünelleme; operatörler, ölçüm, belirsizlik ilkesi",
      reading: "Griffiths KM, Bölüm 2–3 (seçme); 10 problem",
      python: "Schrödinger denklemini sonlu farklar yöntemiyle bir matris özdeğer problemine çevirip sayısal çöz",
      question: "Bir ölçümün sonucu neden bir operatörün özdeğeri? Lineer cebirle bağlantısı ne?" },
    { n: 16, phase: 3, topic: "Açısal momentum ve spin; hidrojen atomu (kavramsal); özdeş parçacıklar, fermiyon ve bozon",
      reading: "Griffiths KM, Bölüm 4–5 (seçme, kavramsal)",
      python: "Spin-1/2 için Pauli matrislerinin özdeğerlerini NumPy ile hesapla",
      question: "Higgs'in spini kaç? Bu, onu diğer bozonlardan nasıl ayırır?" },
    { n: 17, phase: 3, topic: "Çekirdek fiziği: çekirdek yapısı, bağlanma enerjisi, radyoaktif bozunma; parçacıkların maddeyle etkileşimi, dedektör türleri",
      reading: "Thomson, dedektörlerle ilgili bölüm; Serway, nükleer fizik bölümü",
      python: "Radyoaktif bozunmayı simüle et; yarı ömrü üstel fit ile bul",
      question: "Faz 3 kontrolü + Bir kalorimetre ile bir iz dedektörü neyi ölçer?", phaseEnd: true },
    { n: 18, phase: 4, topic: "Standart Model: kuarklar, leptonlar, kuvvetler ve taşıyıcı bozonlar",
      reading: "Griffiths EP, Bölüm 1; 10 problem",
      python: "\"Higgs hunting\" not defterini aç; uproot ile ROOT dosyası okumayı öğren",
      question: "Standart Model parçacıklarını ezbere değil, gruplarıyla açıkla." },
    { n: 19, phase: 4, topic: "Feynman diyagramları; tesir kesiti, ışınlık, bozunum genişliği, ömür, dallanma oranı",
      reading: "Griffiths EP, Bölüm 2; Thomson'ın tesir kesiti ve bozunum oranı kısımları",
      python: "Dört lepton olaylarını seç (yük ve lepton türü koşulları)",
      question: "Bir yılda kaç Higgs üretilir sorusunu tesir kesiti ve ışınlıkla nasıl hesaplarsın?" },
    { n: 20, phase: 4, topic: "Simetriler ve korunum yasaları; zayıf etkileşim, W ve Z bozonları",
      reading: "Griffiths EP, Bölüm 4 ve 9 (genel okuma)",
      python: "Z bozonu tepesini bul ve fit et (Faz 2'deki fit becerisi)",
      question: "Faz 4 kontrolü (Faz sonu kontrolleri sekmesi)", phaseEnd: true, review: true },
    { n: 21, phase: 5, topic: "Kendiliğinden simetri kırılması ve Higgs mekanizması",
      reading: "Griffiths EP, Bölüm 10'un son kısımları (kavramsal)",
      python: "Dört lepton değişmez kütlesi; veriyi sinyal ve arka plan simülasyonuyla karşılaştır",
      question: "Bir alan, parçacıklara nasıl kütle kazandırır? Bir arkadaşına 3 dakikada anlat." },
    { n: 22, phase: 5, topic: "Higgs'in üretimi ve bozunumları; İstatistik III: hipotez testi, p-değeri, güven aralığı, 5 sigma",
      reading: "Thomson, Higgs bölümü; Cowan, Bölüm 4 ve 9; 2012 CMS keşif makalesinin girişi",
      python: "125 GeV tepesini son haline getir; basit bir anlamlılık hesabı yap",
      question: "\"5 sigma\" ne demek? Neden keşif için bu eşik seçildi?" },
    { n: 23, phase: 5, topic: "Genel tekrar; açık kalan sorular",
      reading: "Kendi notların; işaretlediğin sorular",
      python: "Bir sayfalık rapor: amaç, yöntem, grafik, sonuç",
      question: "Final kontrolü + raporla hocaya git", phaseEnd: true }
  ],

  // Haftalık şablon (20 saat). dow: 0=Pzt ... 6=Paz
  template: [
    { dow: 0, hours: 3, block: "Teori", what: "Haftanın konusunu oku, kendi cümlelerinle not çıkar" },
    { dow: 1, hours: 3, block: "Problem", what: "Okuduğun bölümün problemlerini çöz" },
    { dow: 2, hours: 3, block: "Python", what: "Haftanın kodlama adımı" },
    { dow: 3, hours: 3, block: "Teori", what: "Konunun devamı, anlamadığın yerleri tekrar" },
    { dow: 4, hours: 3, block: "Problem", what: "Zor problemler, takıldığın yerler" },
    { dow: 5, hours: 5, block: "Proje + not", what: "Haftalık uygulamayı bitir; sınama sorusu ve haftalık not" },
    { dow: 6, hours: 0, block: "Dinlenme", what: "Bilerek boş. Geride kaldıysan en fazla 2 saat telafi." }
  ],

  // Hafif hafta şablonu (10 saat) — final / vize haftaları
  lightTemplate: [
    { dow: 0, hours: 2, block: "Teori", what: "Kısa okuma / tekrar" },
    { dow: 1, hours: 2, block: "Problem", what: "İşaretlediğin sorular" },
    { dow: 2, hours: 2, block: "Python", what: "Hafif kodlama adımı (varsa)" },
    { dow: 3, hours: 2, block: "Teori", what: "Tekrar, eksik kalan yerler" },
    { dow: 4, hours: 0, block: "Sınav", what: "Okul sınavlarına odaklan" },
    { dow: 5, hours: 2, block: "Sınama + not", what: "Sınama sorusu ve haftalık not" },
    { dow: 6, hours: 0, block: "Dinlenme", what: "Bilerek boş." }
  ],

  reflectionQuestions: [
    { id: "q1", text: "Bu hafta zaman nasıl geçti?", type: "scale", min: "çok yavaş", max: "akıp gitti" },
    { id: "q2", text: "Zorlandığım yerde devam etmek istedim mi?", type: "choice", options: ["Evet", "Kısmen", "Hayır"] },
    { id: "q3", text: "Planın dışında, kendi isteğimle fazladan çalıştım mı?", type: "choice", options: ["Evet", "Hayır"] },
    { id: "q4", text: "Kodlama kısmı ne hissettirdi?", type: "scale", min: "nefret", max: "keyif" },
    { id: "q5", text: "Bu hafta öğrendiğim en ilginç şey neydi?", type: "text" }
  ],

  rules: [
    ["GANO önce gelir.", "Okul derslerinin ödev ve sınav çalışması bu 20 saatin dışında. Programdaki konuların çoğu (lineer cebir, diferansiyel denklemler, fizik, olasılık) okul derslerinle örtüşüyor; ikisi birbirini besliyor."],
    ["Sınav haftaları hafif.", "7. ve 8. haftalar (4–17 Ocak) final dönemi için 10 saate düşürüldü. Bahar dönemi vizelerinde de o haftayı 10 saate indir ve programı bir hafta kaydır (Ayarlar → Vize haftası ekle). Plan bu durumda Mayıs ortasında biter."],
    ["30 dakika kuralı:", "30 dakika uğraşıp çıkamadığın soruyu işaretle ve devam et. Cumartesi o soruya dön ya da hocaya sorulacaklar listesine ekle."],
    ["Kaçırdığın haftayı kaydır, sıkıştırma.", "İki haftalık işi bir haftaya sığdırmak sınamanın sonucunu bozar: Yorgunluk, konunun kendisinden geliyormuş gibi görünür."],
    ["Kaynakların tamamını okuma.", "Tabloda verilen bölümleri oku. Bir konu çok ilgini çekerse derinleşebilirsin, ama bunu programın üstüne ekle, yerine koyma."]
  ],

  sources: [
    ["3B1B", "3Blue1Brown, Essence of Linear Algebra ve Essence of Calculus video serileri (YouTube)", "https://www.3blue1brown.com/topics/linear-algebra"],
    ["Strang", "Gilbert Strang, MIT OCW 18.06 Lineer Cebir dersleri", "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/"],
    ["Serway", "Serway, Fizik I'de kullandığın kitap (salınımlar, dalgalar, EM, görelilik, modern fizik bölümleri)", ""],
    ["Cowan", "Glen Cowan, Statistical Data Analysis (parçacık fizikçileri için yazılmış istatistik kitabı)", ""],
    ["Griffiths KM", "D. J. Griffiths, Introduction to Quantum Mechanics", ""],
    ["Griffiths EP", "D. J. Griffiths, Introduction to Elementary Particles, 2. baskı", ""],
    ["Thomson", "M. Thomson, Modern Particle Physics", ""],
    ["Kalkülüs kitabı", "Kalkülüs I'de kullandığın kitabın çok değişkenli bölümleri ya da MIT OCW 18.02", "https://ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007/"],
    ["Dif. denk. kitabı", "Okulundaki diferansiyel denklemler dersinin kitabı ya da MIT OCW 18.03", "https://ocw.mit.edu/courses/18-03-differential-equations-spring-2010/"],
    ["CERN Open Data", "Higgs → 4ℓ eğitim not defterleri ve açık veri (Faz 4–5 için)", "https://opendata.cern.ch/"]
  ],

  teacherSteps: [
    { id: "t1", when: "27 Kasım (Cuma)", date: "2026-11-27", text: "Ders çıkışı ya da ofis saatinde kendini tanıt, CERN'deki çalışmalarını sor, bu planı göster." },
    { id: "t2", when: "Hafta 2–3", week: 2, text: "Planı hocanın önerileriyle güncelle." },
    { id: "t3", when: "Hafta 12", week: 12, text: "Değişmez kütle fonksiyonunu ve ilk grafiklerini götür." },
    { id: "t4", when: "Hafta 17", week: 17, text: "Çekirdek fiziği haftasında takıldığın soruları sor. Bu onun alanı, sohbet için doğal bir fırsat." },
    { id: "t5", when: "Hafta 20", week: 20, text: "Z bozonu fitini götür; Higgs analizinin son adımları için öneri iste." },
    { id: "t6", when: "Hafta 23", week: 23, text: "Raporunu sun. Uygunsa düzenli çalışma, TÜBİTAK 2209-A (2027 sonbaharı çağrısı) ve ileride Summer Student referans mektubu konularını konuş." }
  ],

  excluded: [
    ["Kuantum alan teorisi", "Yüksek lisans. Higgs mekanizmasının matematiğinin tamamı burada. Bu programda kavramsal düzeyde kalıyorsun."],
    ["Grup teorisi (derinlemesine)", "Fen fakültesinin matematiksel fizik dersi. Programda simetriler kavramsal olarak işleniyor."],
    ["İleri elektromanyetik teori", "EEM'deki elektromanyetik teori dersleri. Programdaki düzey Higgs için yeterli."],
    ["Fourier analizi", "EEM'deki sinyaller ve sistemler dersi. Dalga paketlerini anlamak için faydalı, ama bu programda zorunlu değil."],
    ["Makine öğrenmesi", "Program sonrası. Sinyali arka plandan ayırmanın modern yolu; Higgs analizini yaptıktan sonra doğal bir sonraki adım."]
  ]
};
