# Client Intake System - Visual Flow Diagrams (Mermaid)

## Diagram 1: Client Intake Happy Path

```mermaid
flowchart TD
    Start([Client receives form link]) --> Landing[Landing Page: Intake Form]
    Landing --> Page1[Page 1/5 - 5 Sections]
    Page1 --> Fill1[Client fills fields]
    Fill1 --> AutoSave1[Auto-save to IndexedDB]
    AutoSave1 --> Next1{Client clicks Next}
    Next1 --> Page2[Page 2/5]
    Page2 --> Fill2[Client fills fields]
    Fill2 --> AutoSave2[Auto-save to IndexedDB]
    AutoSave2 --> Next2{Client clicks Next}
    Next2 --> Page3[Page 3/5]
    Page3 --> Fill3[Client fills fields]
    Fill3 --> AutoSave3[Auto-save to IndexedDB]
    AutoSave3 --> Next3{Client clicks Next}
    Next3 --> Page4[Page 4/5]
    Page4 --> Fill4[Client fills fields]
    Fill4 --> AutoSave4[Auto-save to IndexedDB]
    AutoSave4 --> Next4{Client clicks Next}
    Next4 --> Page5[Page 5/5 - Final]
    Page5 --> Fill5[Client fills final fields]
    Fill5 --> Submit{Client clicks Submit}
    Submit --> Validate{Validate all fields}
    Validate -->|Errors found| ShowErrors[Display error messages<br/>Scroll to first error]
    ShowErrors --> FixErrors[Client fixes errors]
    FixErrors --> Submit
    Validate -->|Valid| SaveDB[Save to database]
    SaveDB --> CreateRecord[Create intake_submission record]
    CreateRecord --> CreatePages[Create 5 page_data records]
    CreatePages --> ConfNum[Generate confirmation number]
    ConfNum --> Email[Send confirmation email]
    Email --> Success[Display success screen]
    Success --> Upload[Optional: Upload documents]
    Upload --> End([Submission complete])
```

## Diagram 2: Save & Resume Flow

```mermaid
flowchart TD
    Start([Client on any page]) --> SaveExit{Client clicks Save & Exit}
    SaveExit --> SaveLocal[Save to IndexedDB]
    SaveLocal --> GenToken[Generate unique session token]
    GenToken --> SaveDB[Save session to database]
    SaveDB --> GenURL[Generate resume URL]
    GenURL --> SendEmail[Email resume link to client]
    SendEmail --> ShowModal[Display: Progress saved]
    ShowModal --> ClientLeaves([Client closes browser])
    
    ClientLeaves -.Days later.-> ClickLink([Client clicks email link])
    ClickLink --> ValidateToken{Validate token}
    ValidateToken -->|Expired| ShowExpired[Display: Link expired]
    ShowExpired --> OfferNew[Offer to start new submission]
    OfferNew --> End1([End])
    
    ValidateToken -->|Valid| LoadSession[Load session data from DB]
    LoadSession --> RestoreForm[Restore form to saved page/section]
    RestoreForm --> Continue[Client continues from saved point]
    Continue --> HappyPath[Return to submission flow]
    HappyPath --> End2([End])
```

## Diagram 3: Auto-Save Recovery Flow

```mermaid
flowchart TD
    Start([Client filling form]) --> AutoSave[Auto-save active<br/>Data in IndexedDB]
    AutoSave --> Close[Client closes browser<br/>WITHOUT saving]
    Close --> DataStays[Data remains in IndexedDB only]
    
    DataStays -.Later - same device.-> Return([Client returns to form URL])
    Return --> CheckDB{Check IndexedDB}
    CheckDB -->|No data| BlankForm[Display blank form]
    BlankForm --> End1([End])
    
    CheckDB -->|Data found| ShowBanner[Display: Found unsaved progress<br/>Resume?]
    ShowBanner --> UserChoice{User clicks Yes}
    UserChoice -->|No| BlankForm
    UserChoice -->|Yes| LoadData[Load data from IndexedDB]
    LoadData --> RestoreForm[Restore form to saved state]
    RestoreForm --> Continue[Client continues filling]
    Continue --> HappyPath[Return to submission flow]
    HappyPath --> End2([End])
```

## Diagram 4: Attorney Portal - Search & Review

```mermaid
flowchart TD
    Start([Attorney visits portal]) --> Login[Login screen]
    Login --> Auth{Authenticate}
    Auth -->|Fail| Error[Display error]
    Error --> Login
    Auth -->|Success| Dashboard[Attorney Dashboard]
    Dashboard --> ShowList[Display all submissions<br/>Table view]
    ShowList --> SearchBtn{Attorney clicks Search/Filter}
    SearchBtn --> Modal[Open 960×720px Search Modal]
    Modal --> Filters[Left Pane: Display filters<br/>- Date Range<br/>- Client Name<br/>- Practice Area<br/>- Status]
    Filters --> EnterCriteria[Attorney enters search criteria]
    EnterCriteria --> Query[System queries database]
    Query --> Results{Results found?}
    Results -->|No| NoResults[Display: No matches<br/>Try different filters]
    NoResults --> Filters
    Results -->|Yes| ShowResults[Right Pane: Display results]
    ShowResults --> ClickSubmission{Attorney clicks submission}
    ClickSubmission --> CloseModal[Modal closes]
    CloseModal --> FullView[Display full submission details<br/>All 5 pages]
    FullView --> Review[Attorney reviews information]
    Review --> Actions{Attorney takes action}
    Actions -->|Assign| Assign[Assign to self<br/>Update DB]
    Actions -->|Status| Status[Change status<br/>Update DB]
    Actions -->|Notes| Notes[Add notes<br/>Save to DB]
    Actions -->|Documents| ReqDocs[Request documents<br/>Email client]
    Assign --> BackDash[Return to Dashboard]
    Status --> BackDash
    Notes --> BackDash
    ReqDocs --> BackDash
    BackDash --> End([End])
```

## Diagram 5: Network Failure & Retry

```mermaid
flowchart TD
    Start([Client clicks Submit]) --> Attempt[System attempts database save]
    Attempt --> NetFail{Network failure?}
    NetFail -->|Success| Success[Continue to success screen]
    Success --> End1([End])
    
    NetFail -->|Failure| DataSafe[Data remains in IndexedDB<br/>NOT LOST]
    DataSafe --> ShowError[Display error:<br/>Submission failed<br/>Data saved locally]
    ShowError --> RetryBtn[Display Retry Submit button]
    RetryBtn --> Wait[Client waits for connection]
    Wait --> Retry{Client clicks Retry}
    Retry --> Attempt2[Attempt submission again]
    Attempt2 --> Success2{Success?}
    Success2 -->|Yes| Success
    Success2 -->|No| ShowError
```

## Diagram 6: Document Upload Flow

```mermaid
flowchart TD
    Start([Submission successful]) --> SuccessScreen[Success screen displays]
    SuccessScreen --> UploadSection[Optional: Upload Supporting Documents section]
    UploadSection --> Choice{Client chooses}
    Choice -->|Upload Now| ShowInterface[Display upload interface inline]
    Choice -->|Skip| SendEmail[Email upload link for later]
    
    SendEmail -.Later.-> EmailClick([Client clicks link in email])
    EmailClick --> ShowInterface
    
    ShowInterface --> SelectFiles[Client selects files]
    SelectFiles --> ClickUpload{Client clicks Upload}
    ClickUpload --> CloudStorage[Upload to Cloud Storage]
    CloudStorage --> SaveRefs[Save file references to DB<br/>Linked to submission_id]
    SaveRefs --> Confirm[Display: Documents uploaded successfully]
    Confirm --> NotifyAttorney[Notify attorney of new documents]
    NotifyAttorney --> End([End])
```

---

## How to Use These Diagrams

### Option 1: Mermaid Live Editor
1. Copy any diagram code block
2. Go to https://mermaid.live
3. Paste the code
4. Export as PNG/SVG

### Option 2: Import to Figma
1. Use a Mermaid plugin for Figma
2. Or export from Mermaid Live as SVG
3. Import SVG into Figma for styling

### Option 3: Lucidchart/Miro
1. Recreate manually using the text flows as reference
2. Use the diagram structure as a guide

### Option 4: Include in Documentation
- These Mermaid diagrams render automatically in:
  - GitHub README files
  - Notion (with Mermaid support)
  - Many documentation tools

---

## Visual Design Recommendations

### Color Coding:
- **Client actions**: Blue rectangles
- **System processes**: Green rectangles
- **Decision points**: Yellow diamonds
- **Error states**: Red rounded rectangles
- **Database operations**: Purple cylinders
- **External events** (email, etc.): Orange parallelograms

### Swim Lanes:
Consider creating swim lane diagrams with:
- Lane 1: Client
- Lane 2: Browser (IndexedDB/localStorage)
- Lane 3: Backend System
- Lane 4: Database
- Lane 5: Attorney

This makes it clearer what happens where.
