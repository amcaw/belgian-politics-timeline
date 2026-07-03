<script lang="ts">
	// Collapsible "how the data was processed" panel. Content fact-checked by two
	// review sub-agents (factual accuracy + public-readability).
	let open = $state(false);
</script>

<details class="method" bind:open>
	<summary>
		<span class="chev" class:open>▶</span>
		Comment les données ont été traitées et fusionnées
	</summary>

	<div class="body">
		<p class="lead">
			Ce diagramme suit les partis qui ont siégé à la <strong>Chambre des représentants</strong>
			belge — la chambre basse du Parlement fédéral — lors des <strong>24 élections de 1946 à
			2024</strong>. Voici, en toute transparence, d'où viennent les chiffres et les choix faits.
		</p>

		<blockquote>
			<strong>Le contexte en une phrase :</strong> en Belgique, les grands partis nationaux
			(chrétiens, socialistes, libéraux) se sont chacun scindés, dans les années 1970-80, en un
			parti <strong>flamand</strong> (néerlandophone) et un parti <strong>francophone</strong>.
			Le diagramme suit ces séparations.
		</blockquote>

		<h4>Les sources</h4>
		<p>
			Les résultats officiels proviennent de la <strong>base de données du SPF Intérieur</strong>
			(<code>electionresults.belgium.be</code>), qui recense toutes les élections belges depuis 1848.
			Au niveau national, elle fournit pour chaque parti le nombre de <em>sièges</em> et de
			<em>voix</em>. Les couleurs et la généalogie des partis (qui descend de qui) suivent la
			référence <em>Timeline of Belgian political parties</em> (Wikimedia Commons), recoupée
			avec les articles Wikipédia de chaque parti.
		</p>
		<p>
			Pour les <strong>sièges</strong>, une nuance : pour quelques élections de transition, la base
			éclate un même parti en plusieurs sous-listes régionales, illisibles telles quelles. On
			présente alors les totaux comme le font les tables de référence (Wikipédia).
			<strong>Exemple :</strong> en 1971, chrétiens flamands (CVP), francophones (PSC) et une liste
			commune apparaissent séparément ; on les réunit en un seul total,
			<strong>PSC-CVP : 67 sièges</strong>. Les <strong>pourcentages de voix</strong>, eux, viennent
			directement de la base officielle.
		</p>

		<h4>La fiabilité</h4>
		<p>
			Les sièges des 24 élections ont été recoupés indépendamment avec les tableaux de
			<strong>Wikipédia (FR et EN)</strong>, scrutin par scrutin. Les totaux nationaux par grand
			parti <strong>concordent sur les 24 élections</strong> ; les seuls écarts résiduels tiennent
			aux conventions de présentation des cartels et au regroupement des très petites listes.
		</p>

		<h4>Les partis pris (à connaître)</h4>
		<ul>
			<li>
				<strong>L'épaisseur des flux montre une part (%), pas un nombre de sièges.</strong> La
				taille de la Chambre a changé : <strong>202 sièges en 1946</strong>, 212 de 1949 à 1991,
				puis 150 depuis 1995. Le pourcentage permet de comparer des époques différentes.
			</li>
			<li>
				<strong>Les partis nationaux restent d'un seul bloc tant qu'ils l'étaient</strong>, puis se
				divisent en aile flamande / francophone à une année-charnière (chrétiens et libéraux
				jusqu'en 1971, socialistes jusqu'en 1978). Ces dates suivent la <em>convention des tables
				de référence</em> et non la chronologie exacte des scissions de partis (CVP/PSC dès 1968,
				PS/SP dès 1978).
			</li>
			<li>
				<strong>Quelques listes communes (cartels) sont réparties par estimation</strong> entre les
				deux partenaires, selon des parts fixes — ex. le cartel CD&V/N-VA de 2007, partagé 80/20
				(24 / 6 sièges). Ces sièges par aile sont des approximations, pas des résultats officiels
				par parti ; ils ne concernent qu'une poignée de cas.
			</li>
			<li>
				<strong>Les très petits partenaires de cartel sont absorbés par le grand parti.</strong>
				Le cartel <em>sp.a-Spirit</em> (2003-2007) est compté entièrement en sp.a ; Spirit, parti
				régionaliste de gauche d'un ou deux sièges, n'apparaît donc pas séparément — y compris dans
				la coalition « Au pouvoir », où il figurait pourtant (gouvernement Verhofstadt II). Idem pour
				d'autres micro-listes. C'est un choix de lisibilité : le cartel était un bloc électoral unique.
			</li>
			<li>
				<strong>Le pourcentage de voix</strong> est calculé sur les suffrages des partis affichés
				(hors votes blancs/nuls et hors petites listes regroupées en « autres »), à partir des voix
				officielles de l'IBZ.
			</li>
			<li>
				<strong>Les partis sous 1 % sont regroupés</strong> en « autres », pour garder le diagramme
				lisible.
			</li>
			<li>
				<strong>Deux vues distinctes.</strong> « Résultats » montre le poids de chaque parti
				<em>issu de l'élection</em> (sièges ou voix). « Au pouvoir » montre, gouvernement par
				gouvernement, quels partis composaient la coalition et avec combien de sièges.
			</li>
			<li>
				<strong>Sièges de coalition = à la formation du gouvernement.</strong> Dans la vue « Au
				pouvoir », les sièges affichés sont ceux que chaque parti détenait au moment où le
				gouvernement s'est formé — qui peuvent différer du résultat électoral à cause des
				transfuges et des changements de nom de parti entre l'élection et l'investiture (ex. la
				coalition De Wever compte N-VA&nbsp;23 / MR&nbsp;18 à la formation, alors que l'élection de
				2024 donnait N-VA&nbsp;24 / MR&nbsp;20). Source&nbsp;: les articles de législature de
				Wikipédia, recoupés gouvernement par gouvernement.
			</li>
			<li>
				<strong>Tous les gouvernements sont représentés</strong> (pas seulement un par élection)&nbsp;:
				la frise des Premiers ministres et la vue « Au pouvoir » incluent les
				<strong>50 gouvernements fédéraux</strong> de 1945 (Van Acker II) à 2025 (De Wever), y
				compris les gouvernements éphémères et les remaniements en cours de législature (ex.
				Gaston Eyskens III en 1958, Tindemans II en 1974 — le seul gouvernement auquel le
				Rassemblement wallon ait participé).
			</li>
			<li>
				<strong>La filiation des partis est suivie explicitement.</strong> Une table de filiation
				relie chaque parti à ses ancêtres et successeurs&nbsp;: renommages (PSC → cdH → Les Engagés ;
				SP → sp.a → Vooruit ; PVV → VLD → Open Vld → Anders), scissions (le parti chrétien unitaire → CVP +
				PSC en 1968) et fusions (FDF → MR). C'est ce qui permet de voir Les Engagés comme la suite
				naturelle du cdH, lui-même issu du PSC — et de calculer l'« ancienneté au pouvoir » d'un
				parti en additionnant les années de toute sa lignée, malgré les changements de nom.
			</li>
			<li>
				<strong>Source de la filiation&nbsp;:</strong> elle reprend la généalogie de référence
				<em>Timeline of Belgian political parties</em> (les couleurs en proviennent aussi), recoupée
				avec les articles Wikipédia de chaque parti pour dater précisément renommages, scissions et
				fusions. Les couleurs suivent les conventions usuelles des partis belges (orange = démocrates-
				chrétiens, rouge = socialistes, bleu = libéraux, jaune = nationalistes flamands, vert =
				écologistes, etc.).
			</li>
		</ul>

		<p class="summary">
			En résumé : les chiffres sont officiels et recoupés ; les seuls arrondis portent sur de rares
			listes communes et les très petits partis, et les dates de scission suivent une convention
			d'affichage.
		</p>
	</div>
</details>

<style>
	.method {
		margin-top: 1.5rem;
		border: 1px solid var(--border);
		border-radius: 14px;
		background: var(--surface);
		overflow: hidden;
	}
	summary {
		cursor: pointer;
		padding: 0.85rem 1.1rem;
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--text);
		list-style: none;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		user-select: none;
	}
	summary::-webkit-details-marker { display: none; }
	summary:hover { background: var(--surface-hover); }
	.chev { font-size: 0.7rem; color: var(--accent); transition: transform 0.18s; display: inline-block; }
	.chev.open { transform: rotate(90deg); }

	.body {
		padding: 0.2rem 1.4rem 1.4rem;
		font-size: 0.88rem;
		line-height: 1.6;
		color: var(--text-secondary);
		max-width: 760px;
	}
	.body strong { color: var(--text); }
	.lead { margin-top: 0.4rem; }
	blockquote {
		margin: 0.8rem 0;
		padding: 0.7rem 0.9rem;
		background: var(--accent-soft);
		border-left: 3px solid var(--accent);
		border-radius: 0 8px 8px 0;
		font-size: 0.85rem;
	}
	h4 {
		margin: 1.2rem 0 0.3rem;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}
	ul { margin: 0.3rem 0; padding-left: 1.1rem; }
	li { margin-bottom: 0.5rem; }
	code {
		background: var(--surface-2);
		padding: 0.05rem 0.35rem;
		border-radius: 4px;
		font-size: 0.82em;
		font-family: var(--font-mono);
	}
	.summary {
		margin-top: 1rem;
		padding-top: 0.8rem;
		border-top: 1px solid var(--divider);
		font-style: italic;
		color: var(--text-muted);
	}
</style>
