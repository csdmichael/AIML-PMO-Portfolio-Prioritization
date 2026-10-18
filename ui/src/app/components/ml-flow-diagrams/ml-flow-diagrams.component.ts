import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-ml-flow-diagrams',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="ml-flow-heading" class="ml-flows">
      <h2 id="ml-flow-heading">ML algorithms: end-to-end project flow</h2>
      <p>Follow intake, feature engineering, model inference, policy rules, and human review.
        Open either diagram at full resolution to inspect the detail.</p>
      <figure>
        <a href="assets/images/pmo-end-to-end-ml.png" target="_blank" rel="noopener noreferrer"
          aria-label="Open end-to-end ML project flow at full resolution">
          <img src="assets/images/pmo-end-to-end-ml.png" loading="lazy"
            alt="Six-stage illustrative project walkthrough: intake, data preparation, ML algorithms, rules, recommendation, and human approval." />
        </a>
        <figcaption>End-to-end project walkthrough (illustrative): example scores, confidence,
          model consensus, and write-back are not live results or proof of deployed integrations.</figcaption>
      </figure>
      <figure>
        <a href="assets/images/pmo-ml-algorithms-flow.png" target="_blank" rel="noopener noreferrer"
          aria-label="Open ML algorithm decision flow at full resolution">
          <img src="assets/images/pmo-ml-algorithms-flow.png" loading="lazy"
            alt="Algorithm decision flow through Fabric Bronze, Silver, and Gold; LightGBM, calibration, SHAP, KMeans, confidence, policy rules, and human decision gate." />
        </a>
        <figcaption>Algorithm decision flow: LightGBM is the production classifier; logistic
          regression is a comparison baseline; calibration adjusts probabilities; SHAP explains
          model outputs; KMeans groups similar projects. Rules are deterministic, not ML.</figcaption>
      </figure>
      <p><strong>Implementation boundary:</strong> the two Fabric notebooks train and score.
        Foundry does not retrain or vote with these models: it queries persisted, approved OneLake
        evidence through backend-executed APIM tools. Automated Planview write-back and complete
        enterprise-private networking remain deployment-specific prerequisites.</p>
    </section>
  `,
  styles: [`
    .ml-flows { background: var(--ion-card-background, #fff); padding: 20px; border-radius: 12px; margin: 20px 0; }
    h2 { font-size: 1.35rem; margin-top: 0; }
    figure { margin: 20px 0; }
    img { display: block; width: 100%; height: auto; border: 1px solid #d2d0ce; border-radius: 8px; }
    figcaption { font-size: 0.85rem; line-height: 1.5; padding-top: 8px; }
    p { line-height: 1.6; }
    a:focus-visible { outline: 3px solid #0078d4; outline-offset: 4px; display: block; }
  `],
})
export class MlFlowDiagramsComponent {}
