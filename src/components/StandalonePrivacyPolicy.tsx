import React from 'react';

interface StandalonePrivacyPolicyProps {
  onBack?: () => void;
}

export default function StandalonePrivacyPolicy({ onBack }: StandalonePrivacyPolicyProps) {
  // Simple navigation helper to go to home if onBack isn't provided
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onBack) {
      e.preventDefault();
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Navigation / Header */}
      <header className="bg-[#1A4F8A] text-white py-4 px-6 shadow-sm border-b border-blue-900/10 flex items-center justify-between sticky top-0 z-50">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <a href="/" onClick={handleHomeClick} className="flex items-center gap-2.5 hover:opacity-95 transition-opacity">
            <img src="/logo.png" alt="Interview Ready Logo" className="w-7 h-7 object-contain brightness-0 invert" referrerPolicy="no-referrer" />
            <span className="font-display font-extrabold text-lg tracking-tight">Interview Ready</span>
          </a>
          <a 
            href="/" 
            onClick={handleHomeClick}
            className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 rounded-xl transition-all duration-200"
          >
            Back to Home
          </a>
        </div>
      </header>

      {/* Content Container */}
      <main className="flex-grow py-8 px-4 md:py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-10">
          <div className="mb-8 border-b border-slate-100 pb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">Privacy Policy</h1>
            <p className="text-sm text-slate-500 mt-1.5">Last updated: July 19, 2026</p>
          </div>
          
          <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-slate-600">
            <p>
              This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.
            </p>
            <p>
              We use Your Personal Data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy. This Privacy Policy has been created with the help of the <a href="https://www.termsfeed.com/privacy-policy-generator/" target="_blank" rel="noopener noreferrer" className="text-[#1A4F8A] hover:underline font-semibold">Privacy Policy Generator</a>.
            </p>

            <section className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Interpretation and Definitions</h2>
              <h3 className="text-base font-bold text-slate-800 font-display mt-4 mb-2">Interpretation</h3>
              <p className="mb-4">
                The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
              </p>
              <h3 className="text-base font-bold text-slate-800 font-display mt-4 mb-2">Definitions</h3>
              <p className="mb-3">For the purposes of this Privacy Policy:</p>
              <ul className="list-disc pl-5 space-y-2.5">
                <li>
                  <strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.
                </li>
                <li>
                  <strong>Affiliate</strong> means an entity that controls, is controlled by, or is under common control with a party, where "control" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.
                </li>
                <li>
                  <strong>Application</strong> refers to <span className="font-semibold text-slate-800">Interview Ready</span>, the software program provided by the Company.
                </li>
                <li>
                  <strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Privacy Policy) refers to <span className="font-semibold text-slate-800">Interview Ready</span>.
                </li>
                <li>
                  <strong>Country</strong> refers to: Kenya
                </li>
                <li>
                  <strong>Device</strong> means any device that can access the Service such as a computer, a cell phone or a digital tablet.
                </li>
                <li>
                  <strong>Personal Data</strong> (or "Personal Information") is any information that relates to an identified or identifiable individual.
                  <p className="mt-1 text-slate-500 italic">We use "Personal Data" and "Personal Information" interchangeably unless a law uses a specific term.</p>
                </li>
                <li>
                  <strong>Service</strong> refers to the Application.
                </li>
                <li>
                  <strong>Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company. It refers to third-party companies or individuals employed by the Company to facilitate the Service, to provide the Service on behalf of the Company, to perform services related to the Service or to assist the Company in analyzing how the Service is used.
                </li>
                <li>
                  <strong>Usage Data</strong> refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself (for example, the duration of a page visit).
                </li>
                <li>
                  <strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.
                </li>
              </ul>
            </section>

            <section className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Collecting and Using Your Personal Data</h2>
              <h3 className="text-base font-bold text-slate-800 font-display mt-4 mb-2">Types of Data Collected</h3>
              
              <h4 className="text-sm font-bold text-slate-800 mt-3 mb-2 uppercase tracking-wider text-xs">Personal Data</h4>
              <p className="mb-3">
                While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:
              </p>
              <ul className="list-disc pl-5 space-y-1 mb-4">
                <li>Email address</li>
                <li>First name and last name</li>
                <li>Phone number</li>
                <li>Address, State, Province, ZIP/Postal code, City</li>
              </ul>

              <h4 className="text-sm font-bold text-slate-800 mt-4 mb-2 uppercase tracking-wider text-xs">Usage Data</h4>
              <p className="mb-3">Usage Data is collected automatically when using the Service.</p>
              <p className="mb-3">
                Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.
              </p>
              <p className="mb-3">
                When You access the Service by or through a mobile device, We may collect certain information automatically, including, but not limited to, the type of mobile device You use, Your mobile device's unique ID, the IP address of Your mobile device, Your mobile operating system, the type of mobile Internet browser You use, unique device identifiers and other diagnostic data.
              </p>
              <p className="mb-4">
                We may also collect information that Your browser sends whenever You visit Our Service or when You access the Service by or through a mobile device.
              </p>

              <h3 className="text-base font-bold text-slate-800 font-display mt-6 mb-2">Use of Your Personal Data</h3>
              <p className="mb-3">The Company may use Personal Data for the following purposes:</p>
              <ul className="list-disc pl-5 space-y-2 mb-4">
                <li>
                  <strong>To provide and maintain our Service</strong>, including to monitor the usage of our Service.
                </li>
                <li>
                  <strong>To manage Your Account:</strong> to manage Your registration as a user of the Service. The Personal Data You provide can give You access to different functionalities of the Service that are available to You as a registered user.
                </li>
                <li>
                  <strong>For the performance of a contract:</strong> the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased or of any other contract with Us through the Service.
                </li>
                <li>
                  <strong>To contact You:</strong> To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication, such as a mobile application's push notifications regarding updates or informative communications related to the functionalities, products or contracted services, including the security updates, when necessary or reasonable for their implementation.
                </li>
                <li>
                  <strong>To provide You</strong> with news, special offers, and general information about other goods, services and events which We offer that are similar to those that you have already purchased or inquired about unless You have opted not to receive such information.
                </li>
                <li>
                  <strong>To manage Your requests:</strong> To attend and manage Your requests to Us.
                </li>
                <li>
                  <strong>For business transfers:</strong> We may use Your Personal Data to evaluate or conduct a merger, divestiture, restructuring, reorganization, dissolution, or other sale or transfer of some or all of Our assets, whether as a going concern or as part of bankruptcy, liquidation, or similar proceeding, in which Personal Data held by Us about our Service users is among the assets transferred.
                </li>
                <li>
                  <strong>For other purposes</strong>: We may use Your information for other purposes, such as data analysis, identifying usage trends, determining the effectiveness of our promotional campaigns and to evaluate and improve our Service, products, services, marketing and your experience.
                </li>
              </ul>

              <p className="mb-3">We may share Your Personal Data in the following situations:</p>
              <ul className="list-disc pl-5 space-y-2 mb-4">
                <li><strong>With Service Providers:</strong> We may share Your Personal Data with Service Providers to monitor and analyze the use of our Service, to contact You.</li>
                <li><strong>For business transfers:</strong> We may share or transfer Your Personal Data in connection with, or during negotiations of, any merger, sale of Company assets, financing, or acquisition of all or a portion of Our business to another company.</li>
                <li><strong>With Affiliates:</strong> We may share Your Personal Data with Our affiliates, in which case we will require those affiliates to honor this Privacy Policy. Affiliates include Our parent company and any other subsidiaries, joint venture partners or other companies that We control or that are under common control with Us.</li>
                <li><strong>With business partners:</strong> We may share Your Personal Data with Our business partners to offer You certain products, services or promotions.</li>
                <li><strong>With other users:</strong> If Our Service offers public areas, when You share Personal Data or otherwise interact in the public areas with other users, such information may be viewed by all users and may be publicly distributed outside.</li>
                <li><strong>With Your consent</strong>: We may disclose Your Personal Data for any other purpose with Your consent.</li>
              </ul>
            </section>

            <section className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Retention of Your Personal Data</h2>
              <p className="mb-3">
                The Company will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use Your Personal Data to the extent necessary to comply with our legal obligations (for example, if We are required to retain Your data to comply with applicable laws), resolve disputes, and enforce our legal agreements and policies.
              </p>
              <p className="mb-4">
                Where possible, We apply shorter retention periods and/or reduce identifiability by deleting, aggregating, or anonymizing data. Unless otherwise stated, the retention periods below are maximum periods ("up to") and We may delete or anonymize data sooner when it is no longer needed for the relevant purpose. We apply different retention periods to different categories of Personal Data based on the purpose of processing and legal obligations:
              </p>
              
              <ul className="list-disc pl-5 space-y-3 mb-4">
                <li>
                  <span className="font-semibold text-slate-800">Account Information</span>
                  <ul className="list-circle pl-5 mt-1 space-y-1 text-slate-500">
                    <li>User Accounts: retained for the duration of your account relationship plus up to 24 months after account closure to handle any post-termination issues or resolve disputes.</li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold text-slate-800">Customer Support Data</span>
                  <ul className="list-circle pl-5 mt-1 space-y-1 text-slate-500">
                    <li>Support tickets and correspondence: up to 24 months from the date of ticket closure to resolve follow-up inquiries, track service quality, and defend against potential legal claims</li>
                    <li>Chat transcripts: up to 24 months for quality assurance and staff training purposes.</li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold text-slate-800">Usage Data</span>
                  <ul className="list-circle pl-5 mt-1 space-y-1 text-slate-500">
                    <li>Application usage statistics: up to 24 months to understand feature adoption and service improvements.</li>
                    <li>Server logs (IP addresses, access times): up to 24 months for security monitoring and troubleshooting purposes.</li>
                  </ul>
                </li>
              </ul>

              <p className="mb-3">
                Usage Data is retained in accordance with the retention periods described above, and may be retained longer only where necessary for security, fraud prevention, or legal compliance.
              </p>
              <p className="mb-3">We may retain Personal Data beyond the periods stated above for different reasons:</p>
              <ul className="list-disc pl-5 space-y-1.5 mb-4">
                <li>Legal obligation: We are required by law to retain specific data (e.g., financial records for tax authorities).</li>
                <li>Legal claims: Data is necessary to establish, exercise, or defend legal claims.</li>
                <li>Your explicit request: You ask Us to retain specific information.</li>
                <li>Technical limitations: Data exists in backup systems that are scheduled for routine deletion.</li>
              </ul>
              <p className="mb-3">You may request information about how long We will retain Your Personal Data by contacting Us.</p>
              <p className="mb-3">When retention periods expire, We securely delete or anonymize Personal Data according to the following procedures:</p>
              <ul className="list-disc pl-5 space-y-1.5 mb-4">
                <li>Deletion: Personal Data is removed from Our systems and no longer actively processed.</li>
                <li>Backup retention: Residual copies may remain in encrypted backups for a limited period consistent with our backup retention schedule and are not restored except where necessary for security, disaster recovery, or legal compliance.</li>
                <li>Anonymization: In some cases, We convert Personal Data into anonymous statistical data that cannot be linked back to You. This anonymized data may be retained indefinitely for research and analytics.</li>
              </ul>
            </section>

            <section className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Transfer of Your Personal Data</h2>
              <p className="mb-3">
                Your information, including Personal Data, is processed at the Company's operating offices and in any other places where the parties involved in the processing are located. It means that this information may be transferred to — and maintained on — computers located outside of Your state, province, country or other governmental jurisdiction where the data protection laws may differ from those from Your jurisdiction.
              </p>
              <p className="mb-3">
                Where required by applicable law, We will ensure that international transfers of Your Personal Data are subject to appropriate safeguards and supplementary measures where appropriate. The Company will take all steps reasonably necessary to ensure that Your data is treated securely and in accordance with this Privacy Policy and no transfer of Your Personal Data will take place to an organization or a country unless there are adequate controls in place including the security of Your data and other personal information.
              </p>
            </section>

            <section className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Delete Your Personal Data</h2>
              <p className="mb-3">
                You have the right to delete or request that We assist in deleting the Personal Data that We have collected about You.
              </p>
              <p className="mb-3">
                Our Service may give You the ability to delete certain information about You from within the Service.
              </p>
              <p className="mb-3">
                You may update, amend, or delete Your information at any time by signing in to Your Account, if you have one, and visiting the account settings section that allows you to manage Your personal information. You may also contact Us to request access to, correct, or delete any Personal Data that You have provided to Us.
              </p>
              <p className="mb-3 text-slate-500 italic">
                Please note, however, that We may need to retain certain information when we have a legal obligation or lawful basis to do so.
              </p>
            </section>

            <section className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Disclosure of Your Personal Data</h2>
              <h3 className="text-base font-bold text-slate-800 font-display mt-4 mb-2">Business Transactions</h3>
              <p className="mb-3">
                If the Company is involved in a merger, acquisition or asset sale, Your Personal Data may be transferred. We will provide notice before Your Personal Data is transferred and becomes subject to a different Privacy Policy.
              </p>
              
              <h3 className="text-base font-bold text-slate-800 font-display mt-4 mb-2">Law enforcement</h3>
              <p className="mb-3">
                Under certain circumstances, the Company may be required to disclose Your Personal Data if required to do so by law or in response to valid requests by public authorities (e.g. a court or a government agency).
              </p>

              <h3 className="text-base font-bold text-slate-800 font-display mt-4 mb-2">Other legal requirements</h3>
              <p className="mb-3">The Company may disclose Your Personal Data in the good faith belief that such action is necessary to:</p>
              <ul className="list-disc pl-5 space-y-1.5 mb-4">
                <li>Comply with a legal obligation</li>
                <li>Protect and defend the rights or property of the Company</li>
                <li>Prevent or investigate possible wrongdoing in connection with the Service</li>
                <li>Protect the personal safety of Users of the Service or the public</li>
                <li>Protect against legal liability</li>
              </ul>
            </section>

            <section className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Security of Your Personal Data</h2>
              <p className="mb-3">
                The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially reasonable means to protect Your Personal Data, We cannot guarantee its absolute security.
              </p>
            </section>

            <section className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Children's Privacy</h2>
              <p className="mb-3">
                Our Service does not address anyone under the age of 16. We do not knowingly collect personally identifiable information from anyone under the age of 16. If You are a parent or guardian and You are aware that Your child has provided Us with Personal Data, please contact Us. If We become aware that We have collected Personal Data from anyone under the age of 16 without verification of parental consent, We take steps to remove that information from Our servers.
              </p>
              <p className="mb-3">
                If We need to rely on consent as a legal basis for processing Your information and Your country requires consent from a parent, We may require Your parent's consent before We collect and use that information.
              </p>
            </section>

            <section className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Links to Other Websites</h2>
              <p className="mb-3">
                Our Service may contain links to other websites that are not operated by Us. If You click on a third party link, You will be directed to that third party's site. We strongly advise You to review the Privacy Policy of every site You visit.
              </p>
              <p className="mb-3">
                We have no control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.
              </p>
            </section>

            <section className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Changes to this Privacy Policy</h2>
              <p className="mb-3">
                We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.
              </p>
              <p className="mb-3">
                We will let You know via email and/or a prominent notice on Our Service, prior to the change becoming effective and update the "Last updated" date at the top of this Privacy Policy.
              </p>
              <p className="mb-3">
                You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </section>

            <section className="border-t border-gray-100 pt-6 pb-4">
              <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Contact Us</h2>
              <p className="mb-3">If you have any questions about this Privacy Policy, You can contact us:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  By email: <a href="mailto:info@appinterviewready.top" className="text-[#1A4F8A] hover:underline font-semibold">info@appinterviewready.top</a>
                </li>
                <li>
                  By visiting this page on our website: <a href="http://appinterviewready.top/" rel="external nofollow noopener" target="_blank" className="text-[#1A4F8A] hover:underline font-semibold">http://appinterviewready.top/</a>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-xs border-t border-slate-800">
        <p>© {new Date().getFullYear()} Interview Ready. All rights reserved.</p>
      </footer>
    </div>
  );
}
