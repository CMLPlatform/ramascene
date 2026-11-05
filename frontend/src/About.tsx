const DOCS = 'https://rama-scene.readthedocs.io/en/latest';

const PARTNERS = [
  { name: 'Leiden University, CML', href: 'https://www.universiteitleiden.nl/en/science/environmental-sciences' },
  { name: 'TU Delft', href: 'https://www.tudelft.nl/io/' },
  { name: 'Fraunhofer IBP', href: 'https://www.ibp.fraunhofer.de/' },
  { name: 'VITO', href: 'https://vito.be/en' },
];

const FUNDERS = ['RaMa-Scene', 'Circumat', 'Getting the Data Right'];

function External({ href, children }: { href: string; children: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export default function About() {
  return (
    <main className="about" id="about">
      <h1>About RaMa-Scene</h1>
      <p className="about-lead">
        RaMa-Scene is the RAw MAterials SCENario Efficiency improvement assessment tool and blended learning package.
      </p>

      <section>
        <h2>Project</h2>
        <p>
          RaMa-Scene began as an EIT Raw Materials project. Its aim is to help students, experts, and decision makers
          analyse the global economy and improvements to the circular economy.
        </p>
        <p>
          The project produced two things. The first is a blended learning package for lifelong learning. The second is
          an easy-to-use web application. With it, you create circular economy scenarios with Multi-regional
          Environmentally Extended Input-Output (EEIO) analysis.
        </p>
      </section>

      <section>
        <h2>Funding</h2>
        <p>The RaMa-Scene, Circumat, and Getting the Data Right projects funded this work.</p>
        <ul className="about-list">
          {FUNDERS.map((funder) => (
            <li key={funder}>{funder}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Methods</h2>
        <h3>Environmentally Extended Input-Output (EEIO)</h3>
        <p>
          EEIO is a linear economic and environmental accounting model. It describes how economic actors, such as
          industries and final consumers, relate to each other. It also describes the environmental pressures that
          their activities cause. <External href={`${DOCS}/calculations.html`}>Read more</External>
        </p>
        <h3>Data</h3>
        <p>
          The database is EXIOBASE v3.11.2 (2015–2024; 2024 is a now-cast), in industry-by-industry format
          (RaMa-Scene dataset version v5). You can select from 163 industries, including recycling and waste treatment,
          49 countries and regions, and a list of indicators on greenhouse gases, value added, employment, materials,
          energy, land, water, nutrients and deforestation. Land use and deforestation are not available for 2024.
          This allows complex multi-variate analysis.{' '}
          <External href="http://exiobase.eu/">Read more</External>
        </p>
        <h3>Hotspot and Contribution analysis</h3>
        <p>
          Explore the environmental and economic impact of the production or consumption of goods and services. The
          Hotspot analysis shows the impacts of the production of specific product categories. The Contribution
          analysis shows the impacts along the whole supply chain of a consumed product category.{' '}
          <External href={`${DOCS}/calculations.html`}>Read more</External>
        </p>
        <h3>Main and comparison views</h3>
        <p>
          Compare historic EXIOBASE data with different analytical methods. You can also compare historic data with
          modelled counterfactual scenarios. Each dimension is broken down by sector (tree map) or by geography
          (geo map).
        </p>
        <h3>Scenario modelling</h3>
        <p>
          In the Scenario modelling panel, you create industrial and final consumption scenarios. You apply relative
          changes to final demand and to industrial relationships. You can apply several changes in sequence.
          The tool updates the Leontief inverse directly instead of inverting the full matrix, so most scenarios
          run quickly.{' '}
          <External href={`${DOCS}/modelling.html`}>Read more</External>
        </p>
      </section>

      <section>
        <h2>Regional view</h2>
        <p>
          Through the CircuMAT regions, you can view results at the NUTS2 level for supported countries. These
          regional values are a placeholder split of the country value.
        </p>
      </section>

      <section>
        <h2>Resources</h2>
        <ul className="about-list">
          <li><External href={DOCS}>Documentation on Read the Docs</External></li>
          <li><External href="https://bitbucket.org/CML-IE/rama-scene/src/master/">Source code on Bitbucket</External></li>
          <li><External href="https://www.youtube.com/playlist?list=PLd5x9C95odZ2asmX-DEKsssBG4BBMJRPa">Video tutorials</External></li>
          <li><External href="/static/RaMaScene_platform_manual.pdf">Platform manual (PDF)</External></li>
          <li><External href="https://www.jotform3.leidenuniv.nl/CMLformJweb/rama-scene-feedback">Send feedback</External></li>
        </ul>
      </section>

      <section>
        <h2>Partners</h2>
        <ul className="about-list">
          {PARTNERS.map((partner) => (
            <li key={partner.name}><External href={partner.href}>{partner.name}</External></li>
          ))}
        </ul>
      </section>

      <p className="muted small">
        The clients and developers of the RaMa-Scene application are not responsible for any incorrect or incomplete
        data or information on this website.
      </p>
    </main>
  );
}
