document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnAnalisar").addEventListener("click", analisar);
    document.getElementById("btnExemplo").addEventListener("click", carregarExemplo);
});

function carregarExemplo() {
    document.getElementById("ref").value = "ATGGCCATTGTA";
    document.getElementById("mut").value = "ATGTAGATTGTA";
    analisar();
}

function analisar() {
    const ref = limparSeq(document.getElementById("ref").value);
    const mut = limparSeq(document.getElementById("mut").value);
    const out = document.getElementById("output");

    if (!ref || !mut) {
        out.innerHTML = `<div class="warn">⚠️ Cola as duas sequências.</div>`;
        return;
    }

    if (!soACGT(ref) || !soACGT(mut)) {
        out.innerHTML = `<div class="warn">⚠️ Usa apenas A, C, G, T.</div>`;
        return;
    }

    if (ref.length !== mut.length) {
        out.innerHTML = `<div class="warn">⚠️ As sequências devem ter o mesmo tamanho.</div>`;
        return;
    }

    let dnaMuts = [];
    let refH = "", mutH = "";

    for (let i = 0; i < ref.length; i++) {
        if (ref[i] !== mut[i]) {
            dnaMuts.push({ pos: i + 1, from: ref[i], to: mut[i] });
            refH += `<span class="base mut">${ref[i]}</span>`;
            mutH += `<span class="base mut">${mut[i]}</span>`;
        } else {
            refH += `<span class="base">${ref[i]}</span>`;
            mutH += `<span class="base">${mut[i]}</span>`;
        }
    }

    let aaChanges = [];
    let temSTOP = false;

    if (ref.length % 3 === 0) {
        for (let i = 0; i < ref.length; i += 3) {
            let c1 = ref.slice(i, i + 3);
            let c2 = mut.slice(i, i + 3);

            let aa1 = traduzir(c1);
            let aa2 = traduzir(c2);

            if (aa1 !== aa2) {
                let tipo = "missense";
                if (aa2 === "STOP") {
                    tipo = "nonsense";
                    temSTOP = true;
                }
                aaChanges.push({ codonIndex: i / 3 + 1, aaRef: aa1, aaMut: aa2, tipo });
            }
        }
    }

    // 🔥 NOVO: classificação impacto
    let impacto = "🟢 Baixo";
    let desc = "Sem alteração relevante.";

    if (temSTOP) {
        impacto = "🔴 Alto";
        desc = "STOP prematuro → proteína truncada.";
    } else if (aaChanges.length > 0) {
        impacto = "🟠 Médio";
        desc = "Mutação missense → possível alteração funcional.";
    }

    // 🔥 NOVO: centro ativo (simulado)
    const regioesCriticas = [10, 20, 30];
    let critico = aaChanges.some(c => regioesCriticas.includes(c.codonIndex));

    let alertaCentro = critico
        ? `<p><b>⚠️ Mutação em região crítica da RuBisCO.</b></p>`
        : `<p>Sem mutações em regiões críticas conhecidas.</p>`;

    // tabela DNA
    let dnaRows = dnaMuts.length
        ? dnaMuts.map(m => `<tr><td>${m.pos}</td><td>${m.from}</td><td>${m.to}</td></tr>`).join("")
        : `<tr><td colspan="3">Nenhuma mutação.</td></tr>`;

    out.innerHTML = `
    <div class="summary">
      <div><b>Tamanho:</b> ${ref.length}</div>
      <div><b>Mutações:</b> ${dnaMuts.length}</div>
      <div><b>Alterações AA:</b> ${aaChanges.length}</div>
    </div>

    <h3>Sequências</h3>
    <div class="seqWrap">
      <div class="seq">${refH}</div>
      <div class="seq">${mutH}</div>
    </div>

    <h3>Tabela de mutações</h3>
    <table class="table">
      <tr><th>Pos</th><th>Ref</th><th>Mut</th></tr>
      ${dnaRows}
    </table>

    <h3>Classificação de impacto</h3>
    <div class="implic">
      <b>${impacto}</b><br>${desc}
    </div>

    <h3>Centro ativo</h3>
    <div class="implic">
      ${alertaCentro}
    </div>
    `;
}

function traduzir(c) {
    const t = {
        "TTT": "Phe", "TTC": "Phe", "TTA": "Leu", "TTG": "Leu",
        "CTT": "Leu", "CTC": "Leu", "CTA": "Leu", "CTG": "Leu",
        "ATG": "Met", "GCC": "Ala", "GAC": "Asp", "TAG": "STOP"
    };
    return t[c] || "?";
}

function limparSeq(s) { return (s || "").toUpperCase().replace(/\s/g, ""); }
function soACGT(s) { return /^[ACGT]+$/.test(s); }
