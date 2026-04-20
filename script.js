// Liga o botão ao código (mais robusto do que onclick no HTML)
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btnAnalisar");
    const btnEx = document.getElementById("btnExemplo");

    if (btn) btn.addEventListener("click", analisar);
    if (btnEx) btnEx.addEventListener("click", carregarExemplo);
});

function carregarExemplo() {
    // Exemplo MISSENSE garantido (muda Ala -> Asp)
    document.getElementById("ref").value = "ATGGCCATTGTA";
    document.getElementById("mut").value = "ATGGACATTGTA";
    analisar();
}

function analisar() {
    const refEl = document.getElementById("ref");
    const mutEl = document.getElementById("mut");
    const out = document.getElementById("output");

    if (!refEl || !mutEl || !out) {
        alert("Erro: faltam elementos no HTML (#ref, #mut, #output).");
        return;
    }

    const ref = limparSeq(refEl.value);
    const mut = limparSeq(mutEl.value);

    if (!ref || !mut) {
        out.innerHTML = `<div class="warn">⚠️ Cola as duas sequências.</div>`;
        return;
    }

    if (!soACGT(ref) || !soACGT(mut)) {
        out.innerHTML = `<div class="warn">⚠️ Usa apenas A, C, G, T (sem outras letras).</div>`;
        return;
    }

    if (ref.length !== mut.length) {
        out.innerHTML = `<div class="warn">⚠️ As sequências devem ter o mesmo tamanho.</div>`;
        return;
    }

    // DNA: lista de mutações + highlight
    const dnaMuts = [];
    let refHighlighted = "";
    let mutHighlighted = "";

    for (let i = 0; i < ref.length; i++) {
        const a = ref[i];
        const b = mut[i];
        const pos = i + 1;

        if (a !== b) {
            dnaMuts.push({ pos, from: a, to: b });
            refHighlighted += `<span class="base mut">${a}</span>`;
            mutHighlighted += `<span class="base mut">${b}</span>`;
        } else {
            refHighlighted += `<span class="base">${a}</span>`;
            mutHighlighted += `<span class="base">${b}</span>`;
        }
    }

    // Proteína: só se múltiplo de 3
    const canTranslate = ref.length % 3 === 0;
    const aaChanges = [];
    let hasStopGain = false;

    if (canTranslate) {
        for (let i = 0; i < ref.length; i += 3) {
            const codonRef = ref.slice(i, i + 3);
            const codonMut = mut.slice(i, i + 3);

            const aaRef = traduzir(codonRef);
            const aaMut = traduzir(codonMut);

            if (aaRef === "?" || aaMut === "?") continue;

            if (aaRef !== aaMut) {
                const codonIndex = i / 3 + 1;
                let tipo = "missense (não-sinónima)";

                if (aaMut === "STOP" && aaRef !== "STOP") {
                    tipo = "nonsense (STOP prematuro)";
                    hasStopGain = true;
                } else if (aaRef === "STOP" && aaMut !== "STOP") {
                    tipo = "stop-loss (perda de STOP)";
                }

                aaChanges.push({ codonIndex, codonRef, codonMut, aaRef, aaMut, tipo });
            }
        }
    }

    // Tabela DNA
    const dnaRows = dnaMuts.length
        ? dnaMuts.map(m => `
        <tr>
          <td>${m.pos}</td>
          <td>${m.from}</td>
          <td>${m.to}</td>
        </tr>
      `).join("")
        : `<tr><td colspan="3">Nenhuma mutação encontrada.</td></tr>`;

    // Bloco proteína
    let protBlock = "";
    if (!canTranslate) {
        protBlock = `<div class="warn">⚠️ Comprimento não é múltiplo de 3 — tradução/impacto proteico incertos.</div>`;
    } else {
        const protRows = aaChanges.length
            ? aaChanges.map(c => `
          <tr>
            <td>${c.codonIndex}</td>
            <td>${c.codonRef} → ${c.codonMut}</td>
            <td>${c.aaRef} → ${c.aaMut}</td>
            <td>${c.tipo}</td>
          </tr>
        `).join("")
            : `<tr><td colspan="4">Sem alteração de aminoácido (provavelmente sinónima).</td></tr>`;

        protBlock = `
      <table class="table">
        <thead>
          <tr>
            <th>Codão</th>
            <th>DNA</th>
            <th>Aminoácido</th>
            <th>Classificação</th>
          </tr>
        </thead>
        <tbody>
          ${protRows}
        </tbody>
      </table>
    `;
    }

    // Interpretação
    const interpretacao = gerarInterpretacao({
        dnaMutCount: dnaMuts.length,
        aaChangeCount: aaChanges.length,
        hasStopGain,
        canTranslate
    });

    // Render final (sempre escreve algo)
    out.innerHTML = `
    <div class="summary">
      <div><b>Tamanho:</b> ${ref.length} bp</div>
      <div><b>Mutações (DNA):</b> ${dnaMuts.length}</div>
      <div><b>Alterações AA:</b> ${canTranslate ? aaChanges.length : "—"}</div>
    </div>

    <h3>Sequências (mutações a vermelho)</h3>
    <div class="seqWrap">
      <div class="seqLabel">Referência</div>
      <div class="seq">${refHighlighted}</div>
      <div class="seqLabel">Mutada</div>
      <div class="seq">${mutHighlighted}</div>
    </div>

    <h3>Tabela de mutações (DNA)</h3>
    <table class="table">
      <thead>
        <tr>
          <th>Posição</th>
          <th>Base (ref)</th>
          <th>Base (mut)</th>
        </tr>
      </thead>
      <tbody>
        ${dnaRows}
      </tbody>
    </table>

    <h3>Impacto na proteína (tradução)</h3>
    ${protBlock}

    <h3>Implicações prováveis (com cautela científica)</h3>
    <div class="implic">
      ${interpretacao}
      <p class="note">
        <b>Nota:</b> isto é uma inferência baseada no tipo de mutação (sinónima/missense/nonsense) e não prova funcionalidade.
        O efeito real depende da posição na RbcL, contexto estrutural e validação experimental.
      </p>
    </div>
  `;
}

function limparSeq(s) {
    return (s || "").toUpperCase().replace(/\s/g, "");
}

function soACGT(s) {
    return /^[ACGT]+$/.test(s);
}

function gerarInterpretacao({ dnaMutCount, aaChangeCount, hasStopGain, canTranslate }) {
    if (dnaMutCount === 0) {
        return `<p>Não foram detetadas mutações. Não se espera alteração na RbcL nem impacto previsível na fixação de CO₂.</p>`;
    }

    if (!canTranslate) {
        return `<p>Há mutações no DNA, mas a tradução não é confiável porque o comprimento não é múltiplo de 3. Confirma o “frame”/região codificante antes de concluir sobre função.</p>`;
    }

    if (hasStopGain) {
        return `
      <p>Foi detetado um <b>STOP prematuro</b> (mutação nonsense), o que tende a truncar a RbcL e frequentemente reduz fortemente a estabilidade/atividade.</p>
      <p>Implicação provável: <b>diminuição acentuada</b> da fixação de carbono e possível redução de eficiência fotossintética.</p>
    `;
    }

    if (aaChangeCount === 0) {
        return `
      <p>As mutações parecem <b>sinónimas</b> (sem mudança de aminoácido). Em geral, isso sugere <b>baixo risco</b> de alterar a função da RuBisCO.</p>
      <p>Efeitos subtis em expressão podem existir, mas não são inferíveis com segurança só a partir desta análise.</p>
    `;
    }

    return `
    <p>Há <b>mutações missense (não-sinónimas)</b>, com alteração de aminoácido na RbcL. Isso pode afetar dobragem, estabilidade ou regiões funcionais.</p>
    <p>Implicação provável: <b>risco moderado</b> de reduzir a atividade carboxilase e/ou a eficiência de fixação de CO₂, dependendo da posição e do tipo de substituição.</p>
  `;
}

// Tabela genética (DNA)
function traduzir(codon) {
    const tabela = {
        "TTT": "Phe", "TTC": "Phe", "TTA": "Leu", "TTG": "Leu",
        "CTT": "Leu", "CTC": "Leu", "CTA": "Leu", "CTG": "Leu",
        "ATT": "Ile", "ATC": "Ile", "ATA": "Ile", "ATG": "Met",
        "GTT": "Val", "GTC": "Val", "GTA": "Val", "GTG": "Val",

        "TCT": "Ser", "TCC": "Ser", "TCA": "Ser", "TCG": "Ser",
        "CCT": "Pro", "CCC": "Pro", "CCA": "Pro", "CCG": "Pro",
        "ACT": "Thr", "ACC": "Thr", "ACA": "Thr", "ACG": "Thr",
        "GCT": "Ala", "GCC": "Ala", "GCA": "Ala", "GCG": "Ala",

        "TAT": "Tyr", "TAC": "Tyr", "TAA": "STOP", "TAG": "STOP",
        "CAT": "His", "CAC": "His", "CAA": "Gln", "CAG": "Gln",
        "AAT": "Asn", "AAC": "Asn", "AAA": "Lys", "AAG": "Lys",
        "GAT": "Asp", "GAC": "Asp", "GAA": "Glu", "GAG": "Glu",

        "TGT": "Cys", "TGC": "Cys", "TGA": "STOP", "TGG": "Trp",
        "CGT": "Arg", "CGC": "Arg", "CGA": "Arg", "CGG": "Arg",
        "AGT": "Ser", "AGC": "Ser", "AGA": "Arg", "AGG": "Arg",
        "GGT": "Gly", "GGC": "Gly", "GGA": "Gly", "GGG": "Gly"
    };

    return tabela[codon] || "?";
}